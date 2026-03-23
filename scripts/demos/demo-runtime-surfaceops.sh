#!/bin/bash
# Demo 3: Runtime observation + SurfaceOps visual correlation (concise E2E)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

NODE_BIN="${NODE_BIN:-node}"
CLI_PATH="${CLI_PATH:-}"

RUNTIME_DEMO_PROFILE="${RUNTIME_DEMO_PROFILE:-reference-target}"
REFERENCE_TARGET_URL="${REFERENCE_TARGET_URL:-http://localhost:3004}"
SURFACEOPS_URL="${SURFACEOPS_URL:-http://localhost:3001}"

REPORT_DIR="$(mktemp -d -t surfaces-runtime-demo-XXXXXX)"
trap 'rm -rf "$REPORT_DIR"' EXIT

step() { echo "[STEP] $*"; }
ok() { echo "[OK] $*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

command -v "$NODE_BIN" >/dev/null 2>&1 || fail "Node binary not found: $NODE_BIN"

if [ -z "$CLI_PATH" ]; then
  CLI_PATH="$("$NODE_BIN" "$REPO_ROOT/scripts/interfacectl-tool.mjs" path cli)"
fi
[ -f "$CLI_PATH" ] || fail "interfacectl CLI not found: $CLI_PATH"

export SURFACES_INTERFACECTL_CLI="$CLI_PATH"
export INTERFACECTL_PLAYWRIGHT_HEADLESS="${INTERFACECTL_PLAYWRIGHT_HEADLESS:-1}"

SURFACE_ID=""
CONTRACT_PATH=""
FIXTURE_URL=""
APP_START_HINT=""
VISUAL_URL=""

emit_run() {
  local status="$1"
  local finding_codes="$2"
  local report_path="$3"
  local created_at="$4"
  local run_id="$5"

  "$NODE_BIN" "$REPO_ROOT/scripts/interfacectl-tool.mjs" run cli emit-run-artifact \
    --workspace-root "$REPO_ROOT" \
    --surface "$SURFACE_ID" \
    --source runtime \
    --status "$status" \
    --contract "$CONTRACT_PATH" \
    --report-path "$report_path" \
    --finding-codes "$finding_codes" \
    --created-at "$created_at" \
    --run-id "$run_id" >/dev/null
}

parse_report_summary() {
  local report_path="$1"
  "$NODE_BIN" -e '
const fs = require("fs");
const payload = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const findings = Array.isArray(payload.findings)
  ? [...new Set(payload.findings.map((entry) => String(entry?.code ?? "").trim()).filter(Boolean))]
  : [];
const errors = Number(payload?.summary?.errors ?? 0);
const warnings = Number(payload?.summary?.warnings ?? 0);
const status = errors > 0 ? "fail" : warnings > 0 ? "warn" : "pass";
process.stdout.write(`${status}|${findings.join(",")}`);
' "$report_path"
}

validate_runtime_case() {
  local label="$1"
  local remote_url="$2"
  local expected_status="$3"
  local expected_codes="$4"
  local run_id="$5"
  local created_at="$6"
  local report_slug="$7"

  local report_path="$REPORT_DIR/${report_slug}.report.json"

  step "$label"

  set +e
  local validate_output
  validate_output="$("$NODE_BIN" "$REPO_ROOT/scripts/interfacectl-tool.mjs" run cli validate \
    --workspace-root "$REPO_ROOT" \
    --contract "$CONTRACT_PATH" \
    --surface "$SURFACE_ID" \
    --remote-url "$remote_url" \
    --format json \
    --exit-codes v2 \
    --out "$report_path" 2>&1)"
  local validate_exit=$?
  set -e

  printf '%s\n' "$validate_output"

  [ -f "$report_path" ] || fail "Expected validate report to exist at $report_path"
  case "$validate_exit" in
    0|20|30) ;;
    *) fail "$label validate exited with unexpected code $validate_exit" ;;
  esac

  cat "$report_path"

  local parsed_summary
  parsed_summary="$(parse_report_summary "$report_path")"
  local derived_status
  local derived_codes
  IFS='|' read -r derived_status derived_codes <<<"$parsed_summary"

  [ "$derived_status" = "$expected_status" ] || fail "$label expected status $expected_status, got $derived_status"
  [ "$derived_codes" = "$expected_codes" ] || fail "$label expected finding codes '$expected_codes', got '$derived_codes'"

  emit_run "$derived_status" "$derived_codes" "$report_path" "$created_at" "$run_id"
  ok "$label passed ($derived_status${derived_codes:+ · $derived_codes})"
}

run_reference_target_profile() {
  SURFACE_ID="reference-target-web"
  CONTRACT_PATH="$REPO_ROOT/contracts/generated/reference-target-web.contract.json"
  FIXTURE_URL="$REFERENCE_TARGET_URL"
  APP_START_HINT="Ensure apps are running: pnpm dev:reference-target and pnpm dev:surfaceops"
  VISUAL_URL="$FIXTURE_URL/"

  [ -f "$CONTRACT_PATH" ] || fail "Contract not found: $CONTRACT_PATH"

  step "Precondition"
  echo "Runtime demo profile: reference-target"
  echo "$APP_START_HINT"

  validate_runtime_case \
    "Unobservable targets should warn" \
    "$FIXTURE_URL/?simulateUnobservableTargets=1" \
    "warn" \
    "target.unobservable" \
    "runtime-target-acquisition-unobservable-warn" \
    "2026-03-22T18:08:00.000Z" \
    "target-acquisition.unobservable"

  validate_runtime_case \
    "Undersized target should warn" \
    "$FIXTURE_URL/?simulateUndersizedActionTarget=1" \
    "warn" \
    "target.hit-area-too-small" \
    "runtime-target-acquisition-hit-area-warn" \
    "2026-03-22T18:10:00.000Z" \
    "target-acquisition.hit-area"

  validate_runtime_case \
    "Tight target gap should warn" \
    "$FIXTURE_URL/?simulateTightActionGap=1" \
    "warn" \
    "target.gap-too-tight" \
    "runtime-target-acquisition-gap-warn" \
    "2026-03-22T18:12:00.000Z" \
    "target-acquisition.gap"

  validate_runtime_case \
    "Edge-pinned target should warn" \
    "$FIXTURE_URL/?simulateEdgePinnedActionTarget=1" \
    "warn" \
    "target.edge-inset-too-small" \
    "runtime-target-acquisition-edge-inset-warn" \
    "2026-03-22T18:14:00.000Z" \
    "target-acquisition.edge-inset"

  validate_runtime_case \
    "Crowded destructive target should warn" \
    "$FIXTURE_URL/?simulateCrowdedDestructiveAction=1" \
    "warn" \
    "target.destructive-too-close" \
    "runtime-target-acquisition-destructive-warn" \
    "2026-03-22T18:16:00.000Z" \
    "target-acquisition.destructive"

  validate_runtime_case \
    "Default target acquisition should pass" \
    "$FIXTURE_URL/" \
    "pass" \
    "" \
    "runtime-target-acquisition-pass" \
    "2026-03-22T18:20:00.000Z" \
    "target-acquisition.pass"
}

run_reference_flow_profile() {
  SURFACE_ID="reference-flow-web"
  CONTRACT_PATH="$REPO_ROOT/contracts/generated/reference-flow-web.contract.json"
  FIXTURE_URL="http://localhost:3009"
  APP_START_HINT="Ensure apps are running: pnpm --filter reference-flow-web dev and pnpm dev:surfaceops"
  VISUAL_URL="$FIXTURE_URL/"

  [ -f "$CONTRACT_PATH" ] || fail "Contract not found: $CONTRACT_PATH"

  step "Precondition"
  echo "Runtime demo profile: reference-flow"
  echo "$APP_START_HINT"

  validate_runtime_case \
    "Missing review step should warn" \
    "$FIXTURE_URL/?simulateMissingReviewStep=1" \
    "warn" \
    "flow.steps.required" \
    "runtime-flow-missing-step-warn" \
    "2026-03-22T22:10:00.000Z" \
    "flow.missing-review-step"

  validate_runtime_case \
    "Missing confirm transition should warn" \
    "$FIXTURE_URL/?simulateMissingConfirmTransition=1" \
    "warn" \
    "flow.transition.required" \
    "runtime-flow-missing-transition-warn" \
    "2026-03-22T22:12:00.000Z" \
    "flow.missing-confirm-transition"

  validate_runtime_case \
    "Terminal back edge should warn" \
    "$FIXTURE_URL/?simulateTerminalBackEdge=1" \
    "warn" \
    "flow.terminal.invalid" \
    "runtime-flow-terminal-invalid-warn" \
    "2026-03-22T22:14:00.000Z" \
    "flow.terminal-back-edge"

  validate_runtime_case \
    "Unobservable flow should warn" \
    "$FIXTURE_URL/?simulateUnobservableFlow=1" \
    "warn" \
    "flow.unobservable" \
    "runtime-flow-unobservable-warn" \
    "2026-03-22T22:16:00.000Z" \
    "flow.unobservable"

  validate_runtime_case \
    "Default flow should pass" \
    "$FIXTURE_URL/" \
    "pass" \
    "" \
    "runtime-flow-pass" \
    "2026-03-22T22:20:00.000Z" \
    "flow.pass"
}

case "$RUNTIME_DEMO_PROFILE" in
  reference-target)
    run_reference_target_profile
    ;;
  reference-flow)
    run_reference_flow_profile
    ;;
  *)
    fail "RUNTIME_DEMO_PROFILE must be one of: reference-target, reference-flow (got: $RUNTIME_DEMO_PROFILE)"
    ;;
esac

step "Validate emitted runtime artifacts"
(
  cd "$REPO_ROOT"
  "$NODE_BIN" scripts/validate-run-artifacts.mjs
)
ok "Runtime run artifacts are deterministic and well-formed"

step "Visual segment"
echo "Open fixture page: $VISUAL_URL"
echo "Open SurfaceOps runs detail: $SURFACEOPS_URL/contracts/runs/$SURFACE_ID"

ok "Demo complete: runtime evidence with SurfaceOps correlation proved"
