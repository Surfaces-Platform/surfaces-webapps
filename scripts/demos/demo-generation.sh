#!/bin/bash
# Demo 1: Generation-time contract enforcement (concise E2E)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

NODE_BIN="${NODE_BIN:-node}"
CONTRACT_PATH="${CONTRACT_PATH:-$REPO_ROOT/contracts/surfaces.web.contract.json}"
GUARD_PATH="${GUARD_PATH:-$REPO_ROOT/tools/interfacectl/tools/check-generation-boundaries.mjs}"
RUN_EMITTER_PATH="${RUN_EMITTER_PATH:-$REPO_ROOT/scripts/lib/contract-runs.mjs}"
SURFACE_ID="${SURFACE_ID:-surfaces-web}"
SURFACES_WEB_URL="${SURFACES_WEB_URL:-http://localhost:3000}"

step() { echo "[STEP] $*"; }
ok() { echo "[OK] $*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

emit_run() {
  local status="$1"
  local finding_codes="${2:-}"
  "$NODE_BIN" "$RUN_EMITTER_PATH" emit \
    --root "$REPO_ROOT" \
    --surface-id "$SURFACE_ID" \
    --source generation \
    --status "$status" \
    --finding-codes "$finding_codes" >/dev/null
}

for required in "$CONTRACT_PATH" "$GUARD_PATH" "$RUN_EMITTER_PATH"; do
  [ -f "$required" ] || fail "Required file not found: $required"
done
command -v "$NODE_BIN" >/dev/null 2>&1 || fail "Node binary not found: $NODE_BIN"

"$NODE_BIN" "$RUN_EMITTER_PATH" init --root "$REPO_ROOT" >/dev/null

tmp_dir="$(mktemp -d -t surfaces-demo-generation-XXXXXX)"
trap 'rm -rf "$tmp_dir"' EXIT

bad_descriptor="$tmp_dir/descriptor.bad.json"
good_descriptor="$tmp_dir/descriptor.good.json"
icon_descriptor="$tmp_dir/descriptor.icon.json"

step "Create temporary descriptor with banned shell-owned primitive from a non-allowlisted source"
cat > "$bad_descriptor" <<'JSON'
[
  {
    "surfaceId": "surfaceops-web",
    "primitives": [
      {
        "role": "navigation",
        "count": 1,
        "sources": ["apps/surfaceops-web/app/contracts/page.tsx"]
      }
    ]
  }
]
JSON

set +e
bad_output="$($NODE_BIN "$GUARD_PATH" --contract "$CONTRACT_PATH" --descriptor "$bad_descriptor" 2>&1)"
bad_status=$?
set -e
printf '%s\n' "$bad_output"

[ "$bad_status" -eq 2 ] || fail "Expected guard exit code 2 for bad descriptor, got $bad_status"
printf '%s' "$bad_output" | grep -q "shell-owned-primitive-emitted" || fail "Expected shell-owned-primitive-emitted marker in guard output"
emit_run "fail" "shell-owned-primitive-emitted"
ok "Bad descriptor blocked (exit=2)"

step "Create temporary descriptor with allowlisted shell source"
cat > "$good_descriptor" <<'JSON'
[
  {
    "surfaceId": "surfaceops-web",
    "primitives": [
      {
        "role": "navigation",
        "count": 1,
        "sources": ["apps/surfaceops-web/app/layout.tsx"]
      }
    ]
  }
]
JSON

set +e
good_output="$($NODE_BIN "$GUARD_PATH" --contract "$CONTRACT_PATH" --descriptor "$good_descriptor" 2>&1)"
good_status=$?
set -e
printf '%s\n' "$good_output"

[ "$good_status" -eq 0 ] || fail "Expected guard exit code 0 for allowlisted descriptor, got $good_status"
emit_run "pass" ""
ok "Allowlisted descriptor passed"

step "Create temporary descriptor with icon source input (visibility only at generation time)"
cat > "$icon_descriptor" <<'JSON'
[
  {
    "surfaceId": "surfaces-web",
    "primitives": [],
    "icons": [
      {
        "value": "lucide-react",
        "source": "apps/surfaces-web/app/demos/generation/page.tsx"
      }
    ]
  }
]
JSON

set +e
icon_output="$($NODE_BIN "$GUARD_PATH" --contract "$CONTRACT_PATH" --descriptor "$icon_descriptor" 2>&1)"
icon_status=$?
set -e
printf '%s\n' "$icon_output"

[ "$icon_status" -eq 0 ] || fail "Expected guard exit code 0 for icon descriptor (generation guard does not enforce icons), got $icon_status"
ok "Icon source input accepted by generation guard (no icon-source enforcement at generation time)"
echo "[INFO] Icon-source policy enforcement is deferred to CI/CD time workspace validation in this increment."

echo "Open generation demo page: $SURFACES_WEB_URL/demos/generation"

ok "Demo complete: generation fail->pass proved"
