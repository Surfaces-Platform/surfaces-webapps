#!/usr/bin/env bash
# Generate extraction artifacts for platform surfaces (plus reference target).
# Run from repo root. Uses the shared interfacectl CLI resolver.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_BIN="${NODE_BIN:-node}"
CLI="${CLI:-}"
OUT_DIR="$REPO_ROOT/contracts/generated"

command -v "$NODE_BIN" >/dev/null 2>&1 || {
  echo "Node binary not found: $NODE_BIN" >&2
  exit 1
}

if [[ -z "$CLI" ]]; then
  CLI="$("$NODE_BIN" "$REPO_ROOT/scripts/interfacectl-tool.mjs" path cli)"
fi

SURFACES=(
  "surfaces-web:apps/surfaces-web"
  "surfaceops-web:apps/surfaceops-web"
  "interfacectl-web:apps/interfacectl-web"
  "surfaces-dev:apps/surfaces-dev"
  "reference-target-web:apps/reference-target-web"
  "benchmark-shared-shell-web:apps/benchmark-shared-shell-web"
  "benchmark-destructive-flow-web:apps/benchmark-destructive-flow-web"
  "benchmark-design-tokens-web:apps/benchmark-design-tokens-web"
  "benchmark-async-data-web:apps/benchmark-async-data-web"
)

mkdir -p "$OUT_DIR"
cd "$REPO_ROOT"

for entry in "${SURFACES[@]}"; do
  IFS=: read -r surface app_root <<< "$entry"
  echo "Generating $surface..."
  "$NODE_BIN" "$CLI" generate-contract \
    --app-root "$app_root" \
    --surface "$surface" \
    --out "$OUT_DIR/$surface.contract.json" \
    --report-out "$OUT_DIR/$surface.extraction.json"
done

echo "Applying benchmark contract overlays..."
"$NODE_BIN" "$REPO_ROOT/scripts/apply-benchmark-contract-overlays.mjs"

echo "Done. Artifacts in contracts/generated/"
