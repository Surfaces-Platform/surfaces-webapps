#!/bin/bash
# Demo 3: Runtime edge enforcement + SurfaceOps visual correlation (concise E2E)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

CURL_BIN="${CURL_BIN:-curl}"
NODE_BIN="${NODE_BIN:-node}"
RUN_EMITTER_PATH="${RUN_EMITTER_PATH:-$REPO_ROOT/scripts/lib/contract-runs.mjs}"

SURFACES_WEB_URL="${SURFACES_WEB_URL:-http://localhost:3000}"
SURFACEOPS_URL="${SURFACEOPS_URL:-http://localhost:3001}"
SURFACE_ID="${SURFACE_ID:-surfaces-web}"

EDGE_MANIFEST_PATH="${EDGE_MANIFEST_PATH:-$REPO_ROOT/docs/interfacectl/examples/edge/manifest.json}"

step() { echo "[STEP] $*"; }
ok() { echo "[OK] $*"; }
fail() { echo "[FAIL] $*" >&2; exit 1; }

emit_run() {
  local status="$1"
  local finding_codes="${2:-}"
  "$NODE_BIN" "$RUN_EMITTER_PATH" emit \
    --root "$REPO_ROOT" \
    --surface-id "$SURFACE_ID" \
    --source runtime \
    --status "$status" \
    --finding-codes "$finding_codes" >/dev/null
}

command -v "$CURL_BIN" >/dev/null 2>&1 || fail "curl binary not found: $CURL_BIN"
command -v "$NODE_BIN" >/dev/null 2>&1 || fail "Node binary not found: $NODE_BIN"
[ -f "$RUN_EMITTER_PATH" ] || fail "Run emitter not found: $RUN_EMITTER_PATH"
"$NODE_BIN" "$RUN_EMITTER_PATH" init --root "$REPO_ROOT" >/dev/null

detect_raw_color_policy() {
  if [ ! -f "$EDGE_MANIFEST_PATH" ]; then
    echo "strict"
    return 0
  fi
  "$NODE_BIN" -e '
const fs = require("fs");
const p = process.argv[1];
try {
  const m = JSON.parse(fs.readFileSync(p, "utf8"));
  const policy = m?.color?.rawValues?.policy;
  if (policy === "strict" || policy === "warn" || policy === "off") {
    console.log(policy);
  } else {
    console.log("off");
  }
} catch {
  console.log("off");
}
' "$EDGE_MANIFEST_PATH"
}

step "Precondition"
echo "Ensure apps are running: pnpm dev:surfaces and pnpm dev:surfaceops"

probe() {
  local label="$1"
  local url="$2"
  local expected_code="$3"
  local expected_token="$4"
  local finding_code="$5"
  local header_value="${6:-}"

  step "$label"

  local response
  if [ -n "$header_value" ]; then
    response="$($CURL_BIN -sS -i -H "$header_value" "$url")"
  else
    response="$($CURL_BIN -sS -i "$url")"
  fi

  local status_line
  status_line="$(printf '%s\n' "$response" | head -n 1)"
  local code
  code="$(printf '%s\n' "$status_line" | awk '{print $2}')"

  printf '%s\n' "$response"

  [ "$code" = "$expected_code" ] || fail "$label expected HTTP $expected_code, got $code"
  if [ -n "$expected_token" ]; then
    printf '%s' "$response" | grep -q "$expected_token" || fail "$label expected token '$expected_token' not found"
  fi

  if [ "$expected_code" = "200" ]; then
    emit_run "pass" ""
  else
    emit_run "fail" "$finding_code"
  fi

  ok "$label passed (HTTP $expected_code)"
}

probe "Missing section should be blocked" \
  "$SURFACES_WEB_URL/adaptive/test" \
  "422" \
  "sections.required" \
  "sections.required"

raw_color_policy="$(detect_raw_color_policy)"
if [ "$raw_color_policy" = "strict" ]; then
  probe "Raw color proposal should be blocked (policy=strict)" \
    "$SURFACES_WEB_URL/adaptive/test?section=hero" \
    "422" \
    "color.rawValues" \
    "color.rawValues" \
    "x-proposed-bg: rgba(15, 23, 42, 0.3)"
else
  step "Raw color policy is '$raw_color_policy' (non-blocking)"
  probe "Raw color proposal should be allowed (policy=$raw_color_policy)" \
    "$SURFACES_WEB_URL/adaptive/test?section=hero" \
    "200" \
    "Adaptive Test" \
    "" \
    "x-proposed-bg: rgba(15, 23, 42, 0.3)"
fi

probe "Valid adaptive request should pass" \
  "$SURFACES_WEB_URL/adaptive/test?section=hero" \
  "200" \
  "Adaptive Test" \
  ""

step "Visual segment"
echo "Open adaptive page: $SURFACES_WEB_URL/adaptive/test?section=hero"
echo "Open SurfaceOps runs detail: $SURFACEOPS_URL/contracts/runs/$SURFACE_ID"

ok "Demo complete: runtime gating with SurfaceOps correlation proved"
