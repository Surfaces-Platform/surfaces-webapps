#!/bin/bash
# Demo 2: CI/CD enforcement + SurfaceOps visual correlation (concise E2E)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

NODE_BIN="${NODE_BIN:-node}"
PNPM_BIN="${PNPM_BIN:-pnpm}"

CLI_PATH="${CLI_PATH:-$REPO_ROOT/tools/interfacectl/packages/interfacectl-cli/dist/index.js}"
SURFACE_ID="${SURFACE_ID:-reference-target-web}"
APP_ROOT="${APP_ROOT:-apps/reference-target-web}"
CONTRACT_PATH="${CONTRACT_PATH:-$REPO_ROOT/contracts/generated/$SURFACE_ID.contract.json}"
EXTRACTED_PATH="${EXTRACTED_PATH:-$REPO_ROOT/contracts/generated/$SURFACE_ID.extraction.json}"
RUN_EMITTER_PATH="${RUN_EMITTER_PATH:-$REPO_ROOT/scripts/lib/contract-runs.mjs}"
SURFACEOPS_URL="${SURFACEOPS_URL:-http://localhost:3001}"

SKIP_BUILD="${SKIP_BUILD:-0}"

step() { echo "[STEP] $*"; }
ok() { echo "[OK] $*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

emit_run() {
  local status="$1"
  local finding_codes="${2:-}"
  local report_path="${3:-}"
  "$NODE_BIN" "$RUN_EMITTER_PATH" emit \
    --root "$REPO_ROOT" \
    --surface-id "$SURFACE_ID" \
    --source ci \
    --status "$status" \
    --finding-codes "$finding_codes" \
    --extraction-path "$EXTRACTED_PATH" \
    --report-path "$report_path" >/dev/null
}

for required in "$CLI_PATH" "$RUN_EMITTER_PATH"; do
  [ -f "$required" ] || fail "Required file not found: $required"
done
[ -d "$APP_ROOT" ] || fail "App root not found: $APP_ROOT"
command -v "$NODE_BIN" >/dev/null 2>&1 || fail "Node binary not found: $NODE_BIN"
command -v "$PNPM_BIN" >/dev/null 2>&1 || fail "pnpm binary not found: $PNPM_BIN"

"$NODE_BIN" "$RUN_EMITTER_PATH" init --root "$REPO_ROOT" >/dev/null

tmp_dir="$(mktemp -d -t surfaces-demo-ci-XXXXXX)"
trap 'rm -rf "$tmp_dir"' EXIT

report_path="$tmp_dir/interfacectl-report.demo.json"
bad_extracted_path="$tmp_dir/${SURFACE_ID}.extraction.bad.json"

if [ "$SKIP_BUILD" != "1" ]; then
  step "Build interfacectl CLI"
  "$PNPM_BIN" run interfacectl:build
  ok "CLI build complete"
else
  ok "Skipping CLI build (SKIP_BUILD=1)"
fi

if [ ! -f "$CONTRACT_PATH" ] || [ ! -f "$EXTRACTED_PATH" ]; then
  step "Generate reference-target contract artifacts"
  "$NODE_BIN" "$CLI_PATH" generate-contract \
    --app-root "$APP_ROOT" \
    --surface "$SURFACE_ID" \
    --out "$CONTRACT_PATH" \
    --report-out "$EXTRACTED_PATH"
  ok "Generated reference-target artifacts"
fi

for required in "$CONTRACT_PATH" "$EXTRACTED_PATH"; do
  [ -f "$required" ] || fail "Expected generated artifact to exist: $required"
done

step "Run CI-equivalent edge checks"
"$PNPM_BIN" examples:build-manifest
"$PNPM_BIN" examples:test-edge
ok "Edge checks passed"

step "Run contract validate and emit JSON artifact"
set +e
validate_output="$($NODE_BIN "$CLI_PATH" validate \
  --workspace-root . \
  --contract "$CONTRACT_PATH" \
  --format json \
  --out "$report_path" 2>&1)"
validate_status=$?
set -e
printf '%s\n' "$validate_output"

[ -f "$report_path" ] || fail "Expected validate report to exist at $report_path"
if [ "$validate_status" -eq 0 ]; then
  ok "Validation report written: $report_path"
else
  ok "Validation report written with findings (exit=$validate_status): $report_path"
fi

step "Create temporary malformed extracted artifact"
cat > "$bad_extracted_path" <<JSON
{"surfaceId":"$SURFACE_ID","extracted":
JSON

set +e
bad_output="$($NODE_BIN "$CLI_PATH" validate-extracted \
  --contract "$CONTRACT_PATH" \
  --extracted "$bad_extracted_path" \
  --surface "$SURFACE_ID" \
  --format json \
  --exit-codes v2 2>&1)"
bad_status=$?
set -e
printf '%s\n' "$bad_output"

[ "$bad_status" -eq 10 ] || fail "Expected validate-extracted failure exit code 10, got $bad_status"
printf '%s' "$bad_output" | grep -q 'phase0.load.extracted' || fail "Expected phase0.load.extracted finding in output"
emit_run "fail" "phase0.load.extracted" "$report_path"
ok "Malformed extracted artifact blocked (phase0.load.extracted)"

step "Run validate-extracted against canonical extracted artifact"
"$NODE_BIN" "$CLI_PATH" validate-extracted \
  --contract "$CONTRACT_PATH" \
  --extracted "$EXTRACTED_PATH" \
  --surface "$SURFACE_ID" \
  --exit-codes v2
emit_run "pass" "" "$report_path"
ok "Canonical extracted artifact passes"

step "Visual segment"
echo "Open SurfaceOps Runs page: $SURFACEOPS_URL/contracts/runs"
echo "Open SurfaceOps Surface detail: $SURFACEOPS_URL/contracts/runs/$SURFACE_ID"

ok "Demo complete: CI/CD fail->pass with SurfaceOps correlation proved"
