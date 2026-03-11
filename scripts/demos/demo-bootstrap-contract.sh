#!/bin/bash
# Demo 0: Bootstrap contract artifacts from surface source (concise E2E)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

NODE_BIN="${NODE_BIN:-node}"
PNPM_BIN="${PNPM_BIN:-pnpm}"

CLI_PATH="${CLI_PATH:-}"
SURFACE_ID="${SURFACE_ID:-reference-target-web}"
APP_ROOT="${APP_ROOT:-apps/reference-target-web}"
CONTRACT_PATH="${CONTRACT_PATH:-$REPO_ROOT/contracts/generated/$SURFACE_ID.contract.json}"
RUN_EMITTER_PATH="${RUN_EMITTER_PATH:-$REPO_ROOT/scripts/lib/contract-runs.mjs}"

SKIP_BUILD="${SKIP_BUILD:-0}"
PROMOTE_BOOTSTRAP="${PROMOTE_BOOTSTRAP:-0}"

for arg in "$@"; do
  if [ "$arg" = "--promote" ]; then
    PROMOTE_BOOTSTRAP=1
  fi
done

step() { echo "[STEP] $*"; }
ok() { echo "[OK] $*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

emit_run() {
  local status="$1"
  local finding_codes="${2:-}"
  local extraction_path="$3"
  "$NODE_BIN" "$RUN_EMITTER_PATH" emit \
    --root "$REPO_ROOT" \
    --surface-id "$SURFACE_ID" \
    --source bootstrap \
    --status "$status" \
    --finding-codes "$finding_codes" \
    --extraction-path "$extraction_path" >/dev/null
}

command -v "$NODE_BIN" >/dev/null 2>&1 || fail "Node binary not found: $NODE_BIN"
command -v "$PNPM_BIN" >/dev/null 2>&1 || fail "pnpm binary not found: $PNPM_BIN"
if [ -z "$CLI_PATH" ]; then
  CLI_PATH="$("$NODE_BIN" "$REPO_ROOT/scripts/interfacectl-tool.mjs" path cli)"
fi
[ -f "$CLI_PATH" ] || fail "interfacectl CLI not found: $CLI_PATH"
[ -f "$RUN_EMITTER_PATH" ] || fail "Run emitter not found: $RUN_EMITTER_PATH"

"$NODE_BIN" "$RUN_EMITTER_PATH" init --root "$REPO_ROOT" >/dev/null

tmp_dir="$(mktemp -d -t surfaces-demo-bootstrap-XXXXXX)"
trap 'rm -rf "$tmp_dir"' EXIT

if [ "$PROMOTE_BOOTSTRAP" = "1" ]; then
  boot_contract="$REPO_ROOT/contracts/generated/$SURFACE_ID.contract.json"
  boot_extraction="$REPO_ROOT/contracts/generated/$SURFACE_ID.extraction.json"
  ok "Promote mode enabled: writing artifacts to contracts/generated/"
else
  boot_contract="$tmp_dir/$SURFACE_ID.contract.json"
  boot_extraction="$tmp_dir/$SURFACE_ID.extraction.json"
fi

if [ "$SKIP_BUILD" != "1" ]; then
  step "Build interfacectl CLI"
  "$PNPM_BIN" run interfacectl:build
  ok "CLI build complete"
else
  ok "Skipping CLI build (SKIP_BUILD=1)"
fi

step "Bootstrap contract artifacts from source app"
"$NODE_BIN" "$CLI_PATH" generate-contract \
  --app-root "$APP_ROOT" \
  --surface "$SURFACE_ID" \
  --out "$boot_contract" \
  --report-out "$boot_extraction"

[ -f "$boot_contract" ] || fail "Bootstrapped contract artifact missing: $boot_contract"
[ -f "$boot_extraction" ] || fail "Bootstrapped extraction artifact missing: $boot_extraction"
ok "Bootstrapped artifacts created"
echo "  contract:   $boot_contract"
echo "  extraction: $boot_extraction"

if [ ! -f "$CONTRACT_PATH" ]; then
  step "Canonical contract missing at $CONTRACT_PATH; validating against bootstrapped contract"
  CONTRACT_PATH="$boot_contract"
fi

step "Validate extracted bootstrap artifact against canonical contract"
"$NODE_BIN" "$CLI_PATH" validate-extracted \
  --contract "$CONTRACT_PATH" \
  --extracted "$boot_extraction" \
  --surface "$SURFACE_ID" \
  --exit-codes v2
ok "Bootstrap extraction complies with canonical contract"

summary="$($NODE_BIN -e '
const fs = require("fs");
const extractionPath = process.argv[1];
const payload = JSON.parse(fs.readFileSync(extractionPath, "utf8"));
const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
const codeCounts = {};
for (const w of warnings) {
  const code = String(w && w.code ? w.code : "unknown");
  codeCounts[code] = (codeCounts[code] || 0) + 1;
}
const adapter = payload.adapter || payload.extracted?.adapter || {};
const templates = payload.extracted?.designSystemTemplates || {};
const warningCodes = Object.keys(codeCounts).sort();
const warningCodeCsv = warningCodes.join(",");
console.log(JSON.stringify({
  surfaceId: payload.surfaceId || "unknown",
  adapterFramework: adapter.framework || "unknown",
  adapterId: adapter.id || "unknown",
  adapterDetection: adapter.detection || "unknown",
  templateFramework: templates.framework || "unknown",
  templateProfile: templates.profile || "unknown",
  warningCount: warnings.length,
  warningCodeCsv,
  warningCodeSummary: codeCounts,
}, null, 2));
' "$boot_extraction")"

warning_count="$($NODE_BIN -e 'const s=JSON.parse(process.argv[1]); console.log(String(s.warningCount || 0));' "$summary")"
warning_codes="$($NODE_BIN -e 'const s=JSON.parse(process.argv[1]); console.log(s.warningCodeCsv || "");' "$summary")"
run_status="pass"
if [ "$warning_count" != "0" ]; then
  run_status="warn"
fi
emit_run "$run_status" "$warning_codes" "$boot_extraction"
ok "Bootstrap run event emitted (status=$run_status)"

step "Summary"
printf '%s\n' "$summary"

ok "Demo complete: bootstrap proved"
