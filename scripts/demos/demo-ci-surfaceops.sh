#!/bin/bash
# Demo 2: CI/CD enforcement + SurfaceOps visual correlation (concise E2E)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

NODE_BIN="${NODE_BIN:-node}"
PNPM_BIN="${PNPM_BIN:-pnpm}"

CLI_PATH="${CLI_PATH:-$REPO_ROOT/tools/interfacectl/packages/interfacectl-cli/dist/index.js}"
CONTRACT_PATH="${CONTRACT_PATH:-$REPO_ROOT/contracts/surfaces.web.contract.json}"
EXTRACTED_PATH="${EXTRACTED_PATH:-$REPO_ROOT/contracts/generated/surfaces-web.extraction.json}"
RUN_EMITTER_PATH="${RUN_EMITTER_PATH:-$REPO_ROOT/scripts/lib/contract-runs.mjs}"
SURFACE_ID="${SURFACE_ID:-surfaces-web}"
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

for required in "$CLI_PATH" "$CONTRACT_PATH" "$EXTRACTED_PATH" "$RUN_EMITTER_PATH"; do
  [ -f "$required" ] || fail "Required file not found: $required"
done
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

step "Run CI-equivalent edge checks"
"$PNPM_BIN" examples:build-manifest
"$PNPM_BIN" examples:test-edge
ok "Edge checks passed"

step "Run contract validate and emit JSON artifact"
"$NODE_BIN" "$CLI_PATH" validate \
  --workspace-root . \
  --contract "$CONTRACT_PATH" \
  --format json \
  --out "$report_path"

[ -f "$report_path" ] || fail "Expected validate report to exist at $report_path"
ok "Validation report written: $report_path"

step "Create temporary bad extracted artifact with authAware=false"
cp "$EXTRACTED_PATH" "$bad_extracted_path"
"$NODE_BIN" -e '
const fs = require("fs");
const p = process.argv[1];
const payload = JSON.parse(fs.readFileSync(p, "utf8"));
payload.extracted = payload.extracted || {};
payload.extracted.authAware = false;
fs.writeFileSync(p, JSON.stringify(payload, null, 2));
' "$bad_extracted_path"

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

[ "$bad_status" -eq 30 ] || fail "Expected validate-extracted failure exit code 30, got $bad_status"
printf '%s' "$bad_output" | grep -q 'phase0.authPosture.mismatch' || fail "Expected phase0.authPosture.mismatch finding in output"
emit_run "fail" "phase0.authPosture.mismatch" "$report_path"
ok "Synthetic regression blocked (phase0.authPosture.mismatch)"

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
