#!/bin/bash
# Demo 2: CI/CD enforcement + SurfaceOps visual correlation (concise E2E)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

NODE_BIN="${NODE_BIN:-node}"
PNPM_BIN="${PNPM_BIN:-pnpm}"

CLI_PATH="${CLI_PATH:-}"
SURFACE_ID="${SURFACE_ID:-reference-target-web}"
APP_ROOT="${APP_ROOT:-apps/reference-target-web}"
CONTRACT_PATH="${CONTRACT_PATH:-$REPO_ROOT/contracts/generated/$SURFACE_ID.contract.json}"
EXTRACTED_PATH="${EXTRACTED_PATH:-$REPO_ROOT/contracts/generated/$SURFACE_ID.extraction.json}"
RUN_EMITTER_PATH="${RUN_EMITTER_PATH:-$REPO_ROOT/scripts/lib/contract-runs.mjs}"
SURFACEOPS_URL="${SURFACEOPS_URL:-http://localhost:3001}"

SKIP_BUILD="${SKIP_BUILD:-0}"
ICON_PILOT_MODE="${ICON_PILOT_MODE:-both}"
ICON_PILOT_FIXTURE_SURFACE_ID="${ICON_PILOT_FIXTURE_SURFACE_ID:-icon-demo-web}"
ICON_PILOT_OUTPUT_DIR="${ICON_PILOT_OUTPUT_DIR:-}"

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

assert_icon_finding() {
  local report_path="$1"
  local expected_severity="$2"

  "$NODE_BIN" -e '
const fs = require("fs");
const reportPath = process.argv[1];
const expectedSeverity = process.argv[2];
const payload = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const findings = Array.isArray(payload.findings) ? payload.findings : [];
const finding = findings.find((entry) => entry.code === "icon.source-disallowed");
if (!finding) {
  console.error("icon.source-disallowed finding missing");
  process.exit(1);
}
if (finding.severity !== expectedSeverity) {
  console.error(`Expected severity ${expectedSeverity}, found ${finding.severity}`);
  process.exit(2);
}
console.log(`icon.source-disallowed (${finding.severity})`);
' "$report_path" "$expected_severity" >/dev/null
}

persist_icon_pilot_output() {
  local mode="$1"
  local report_path="$2"
  local exit_code="$3"
  local severity="$4"

  [ -n "$ICON_PILOT_OUTPUT_DIR" ] || return 0
  mkdir -p "$ICON_PILOT_OUTPUT_DIR"
  cp "$report_path" "$ICON_PILOT_OUTPUT_DIR/icon.$mode.report.json"
  "$NODE_BIN" -e '
const fs = require("fs");
const metaPath = process.argv[1];
const mode = process.argv[2];
const exitCode = Number(process.argv[3]);
const severity = process.argv[4];
const payload = {
  mode,
  exitCode,
  findingCode: "icon.source-disallowed",
  severity,
};
fs.writeFileSync(metaPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
' "$ICON_PILOT_OUTPUT_DIR/icon.$mode.meta.json" "$mode" "$exit_code" "$severity"
}

[ -d "$APP_ROOT" ] || fail "App root not found: $APP_ROOT"
command -v "$NODE_BIN" >/dev/null 2>&1 || fail "Node binary not found: $NODE_BIN"
command -v "$PNPM_BIN" >/dev/null 2>&1 || fail "pnpm binary not found: $PNPM_BIN"
if [ -z "$CLI_PATH" ]; then
  CLI_PATH="$("$NODE_BIN" "$REPO_ROOT/scripts/interfacectl-tool.mjs" path cli)"
fi
for required in "$CLI_PATH" "$RUN_EMITTER_PATH"; do
  [ -f "$required" ] || fail "Required file not found: $required"
done
case "$ICON_PILOT_MODE" in
warn|strict|both) ;;
*) fail "ICON_PILOT_MODE must be one of: warn, strict, both (got: $ICON_PILOT_MODE)" ;;
esac

"$NODE_BIN" "$RUN_EMITTER_PATH" init --root "$REPO_ROOT" >/dev/null

tmp_dir="$(mktemp -d -t surfaces-demo-ci-XXXXXX)"
trap 'rm -rf "$tmp_dir"' EXIT

report_path="$tmp_dir/interfacectl-report.demo.json"
bad_extracted_path="$tmp_dir/${SURFACE_ID}.extraction.bad.json"
icon_fixture_root="$tmp_dir/icon-fixture"
icon_surface_id="$ICON_PILOT_FIXTURE_SURFACE_ID"
icon_app_root="$icon_fixture_root/apps/$icon_surface_id"
icon_warn_contract_path="$icon_fixture_root/contracts/icon.warn.contract.json"
icon_strict_contract_path="$icon_fixture_root/contracts/icon.strict.contract.json"
icon_warn_report_path="$tmp_dir/interfacectl-report.icon.warn.json"
icon_strict_report_path="$tmp_dir/interfacectl-report.icon.strict.json"
ok "Icon pilot mode: $ICON_PILOT_MODE (fixture surface: $icon_surface_id)"

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

step "Create temporary icon fixture workspace for authoritative CI/CD icon checks"
mkdir -p "$icon_app_root/app" "$icon_fixture_root/contracts"

cat > "$icon_app_root/app/page.tsx" <<'TSX'
import { House } from "lucide-react";

export default function IconDemoPage() {
  return (
    <main className="contract-container">
      <section data-contract-section="landing.hero">
        <House />
        <h1>Icon Demo Fixture</h1>
      </section>
    </main>
  );
}
TSX

cat > "$icon_app_root/app/globals.css" <<'CSS'
:root {
  --contract-max-width: 1120px;
}
CSS

cat > "$icon_warn_contract_path" <<JSON
{
  "contractId": "icon-demo.warn",
  "version": "0.1.0",
  "surfaces": [
    {
      "id": "$icon_surface_id",
      "displayName": "Icon Demo Web",
      "type": "web",
      "requiredSections": ["landing.hero"],
      "allowedFonts": ["sans-serif"],
      "layout": {
        "maxContentWidth": 1120,
        "requiredContainers": ["contract-container"]
      },
      "icons": {
        "policy": "warn",
        "allowedSources": ["@heroicons/react/24/outline"]
      }
    }
  ],
  "sections": [
    {
      "id": "landing.hero",
      "intent": "primary-intro",
      "description": "Icon fixture section."
    }
  ],
  "constraints": {
    "motion": {
      "allowedDurationsMs": [120],
      "allowedTimingFunctions": ["linear"]
    }
  },
  "color": {
    "policy": "off",
    "allowedValues": []
  }
}
JSON

cat > "$icon_strict_contract_path" <<JSON
{
  "contractId": "icon-demo.strict",
  "version": "0.1.0",
  "surfaces": [
    {
      "id": "$icon_surface_id",
      "displayName": "Icon Demo Web",
      "type": "web",
      "requiredSections": ["landing.hero"],
      "allowedFonts": ["sans-serif"],
      "layout": {
        "maxContentWidth": 1120,
        "requiredContainers": ["contract-container"]
      },
      "icons": {
        "policy": "strict",
        "allowedSources": ["@heroicons/react/24/outline"]
      }
    }
  ],
  "sections": [
    {
      "id": "landing.hero",
      "intent": "primary-intro",
      "description": "Icon fixture section."
    }
  ],
  "constraints": {
    "motion": {
      "allowedDurationsMs": [120],
      "allowedTimingFunctions": ["linear"]
    }
  },
  "color": {
    "policy": "off",
    "allowedValues": []
  }
}
JSON

if [ "$ICON_PILOT_MODE" = "warn" ] || [ "$ICON_PILOT_MODE" = "both" ]; then
  step "Run icon policy validate in warn mode (expected non-blocking visibility)"
  set +e
  icon_warn_output="$($NODE_BIN "$CLI_PATH" validate \
    --workspace-root "$icon_fixture_root" \
    --contract "$icon_warn_contract_path" \
    --surface "$icon_surface_id" \
    --format json \
    --out "$icon_warn_report_path" \
    --exit-codes v2 2>&1)"
  icon_warn_status=$?
  set -e
  printf '%s\n' "$icon_warn_output"

  [ -f "$icon_warn_report_path" ] || fail "Expected icon warn report to exist at $icon_warn_report_path"
  [ "$icon_warn_status" -eq 0 ] || fail "Expected icon warn validate exit code 0, got $icon_warn_status"
  assert_icon_finding "$icon_warn_report_path" "warning" || fail "Expected warning-level icon.source-disallowed finding"
  persist_icon_pilot_output "warn" "$icon_warn_report_path" "$icon_warn_status" "warning"
  emit_run "warn" "icon.source-disallowed" "$icon_warn_report_path"
  ok "Icon warn finding confirmed: icon.source-disallowed (warning, exit=0)"
else
  ok "Skipping icon warn pilot path (ICON_PILOT_MODE=$ICON_PILOT_MODE)"
fi

if [ "$ICON_PILOT_MODE" = "strict" ] || [ "$ICON_PILOT_MODE" = "both" ]; then
  step "Run icon policy validate in strict mode (expected blocking)"
  set +e
  icon_strict_output="$($NODE_BIN "$CLI_PATH" validate \
    --workspace-root "$icon_fixture_root" \
    --contract "$icon_strict_contract_path" \
    --surface "$icon_surface_id" \
    --format json \
    --out "$icon_strict_report_path" \
    --exit-codes v2 2>&1)"
  icon_strict_status=$?
  set -e
  printf '%s\n' "$icon_strict_output"

  [ -f "$icon_strict_report_path" ] || fail "Expected icon strict report to exist at $icon_strict_report_path"
  [ "$icon_strict_status" -eq 20 ] || fail "Expected icon strict validate exit code 20, got $icon_strict_status"
  assert_icon_finding "$icon_strict_report_path" "error" || fail "Expected error-level icon.source-disallowed finding"
  persist_icon_pilot_output "strict" "$icon_strict_report_path" "$icon_strict_status" "error"
  emit_run "fail" "icon.source-disallowed" "$icon_strict_report_path"
  ok "Icon strict finding confirmed: icon.source-disallowed (error, exit=20)"
else
  ok "Skipping icon strict pilot path (ICON_PILOT_MODE=$ICON_PILOT_MODE)"
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
