#!/bin/bash
# Demo 0: Bootstrap contract artifacts from surface source

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

NODE_BIN="${NODE_BIN:-node}"
PNPM_BIN="${PNPM_BIN:-pnpm}"

CLI_PATH="${CLI_PATH:-$REPO_ROOT/tools/interfacectl/packages/interfacectl-cli/dist/index.js}"
CONTRACT_PATH="${CONTRACT_PATH:-$REPO_ROOT/contracts/surfaces.web.contract.json}"
APP_ROOT="${APP_ROOT:-apps/surfaces-web}"
SURFACE_ID="${SURFACE_ID:-surfaces-web}"
RUN_EMITTER_PATH="${RUN_EMITTER_PATH:-$REPO_ROOT/scripts/lib/contract-runs.mjs}"

SKIP_BUILD="${SKIP_BUILD:-0}"
PROMOTE_BOOTSTRAP="${PROMOTE_BOOTSTRAP:-0}"

for arg in "$@"; do
  if [ "$arg" = "--promote" ]; then
    PROMOTE_BOOTSTRAP=1
  fi
done

step() { echo "[STEP] $*"; }
expect() { echo "[EXPECT] $*"; }
result() { echo "[RESULT] $*"; }
warn() { echo "[WARN] $*"; }
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

[ -f "$CONTRACT_PATH" ] || fail "Canonical contract not found: $CONTRACT_PATH"
[ -f "$CLI_PATH" ] || fail "interfacectl CLI not found: $CLI_PATH"
[ -f "$RUN_EMITTER_PATH" ] || fail "Run emitter not found: $RUN_EMITTER_PATH"
command -v "$NODE_BIN" >/dev/null 2>&1 || fail "Node binary not found: $NODE_BIN"
command -v "$PNPM_BIN" >/dev/null 2>&1 || fail "pnpm binary not found: $PNPM_BIN"

"$NODE_BIN" "$RUN_EMITTER_PATH" init --root "$REPO_ROOT" >/dev/null

tmp_dir="$(mktemp -d -t surfaces-demo-bootstrap-XXXXXX)"
trap 'rm -rf "$tmp_dir"' EXIT

if [ "$PROMOTE_BOOTSTRAP" = "1" ]; then
  boot_contract="$REPO_ROOT/contracts/generated/$SURFACE_ID.contract.json"
  boot_extraction="$REPO_ROOT/contracts/generated/$SURFACE_ID.extraction.json"
  result "Promote mode enabled: writing bootstrap artifacts to contracts/generated/"
else
  boot_contract="$tmp_dir/$SURFACE_ID.contract.json"
  boot_extraction="$tmp_dir/$SURFACE_ID.extraction.json"
fi

if [ "$SKIP_BUILD" != "1" ]; then
  step "Build interfacectl CLI"
  "$PNPM_BIN" run interfacectl:build
  result "CLI build complete"
else
  warn "Skipping CLI build (SKIP_BUILD=1)"
fi

step "Bootstrap contract artifacts from source app"
expect "generate-contract writes fresh contract + extraction artifacts"
"$NODE_BIN" "$CLI_PATH" generate-contract \
  --app-root "$APP_ROOT" \
  --surface "$SURFACE_ID" \
  --out "$boot_contract" \
  --report-out "$boot_extraction"

[ -f "$boot_contract" ] || fail "Bootstrapped contract artifact missing: $boot_contract"
[ -f "$boot_extraction" ] || fail "Bootstrapped extraction artifact missing: $boot_extraction"

result "Bootstrapped artifacts created"

echo "  Contract: $boot_contract"
echo "  Extraction: $boot_extraction"

step "Validate extracted bootstrap artifact against canonical contract"
expect "validate-extracted exits 0 for current source"
"$NODE_BIN" "$CLI_PATH" validate-extracted \
  --contract "$CONTRACT_PATH" \
  --extracted "$boot_extraction" \
  --surface "$SURFACE_ID" \
  --exit-codes v2
result "Bootstrap extraction is compliant with canonical contract"

emit_run "pass" "" "$boot_extraction"
result "Bootstrap run event emitted to contracts/generated/contract-runs.json"

step "Show bootstrap summary"
summary="$($NODE_BIN -e '
const fs = require("fs");
const contractPath = process.argv[1];
const extractionPath = process.argv[2];
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const extraction = JSON.parse(fs.readFileSync(extractionPath, "utf8"));
const sections = Array.isArray(contract.sections) ? contract.sections.length : 0;
const routes = Array.isArray(extraction.extracted?.routes) ? extraction.extracted.routes.length : 0;
const ds = Array.isArray(extraction.extracted?.designSystemComponents) ? extraction.extracted.designSystemComponents.length : 0;
console.log(JSON.stringify({contractId: contract.contractId, surfaceId: extraction.surfaceId, sectionCount: sections, routeCount: routes, designSystemComponentCount: ds}, null, 2));
' "$boot_contract" "$boot_extraction")"
printf '%s\n' "$summary"

result "Demo complete: contract bootstrapping from surface source proved"
