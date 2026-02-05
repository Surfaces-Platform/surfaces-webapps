#!/usr/bin/env bash
# Generate extraction artifacts for all four surfaces.
# Run from repo root. Requires interfacectl CLI built (pnpm interfacectl:build).
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI="$REPO_ROOT/tools/interfacectl/packages/interfacectl-cli/dist/index.js"
OUT_DIR="$REPO_ROOT/contracts/generated"

if [[ ! -f "$CLI" ]]; then
  echo "interfacectl CLI not found. Run: pnpm interfacectl:build"
  exit 1
fi

SURFACES=(
  "surfaces-web:apps/surfaces-web"
  "surfaceops-web:apps/surfaceops-web"
  "interfacectl-web:apps/interfacectl-web"
  "surfaces-dev:apps/surfaces-dev"
)

mkdir -p "$OUT_DIR"
cd "$REPO_ROOT"

for entry in "${SURFACES[@]}"; do
  IFS=: read -r surface app_root <<< "$entry"
  echo "Generating $surface..."
  node "$CLI" generate-contract \
    --app-root "$app_root" \
    --surface "$surface" \
    --out "$OUT_DIR/$surface.contract.json" \
    --report-out "$OUT_DIR/$surface.extraction.json"
done

echo "Done. Artifacts in contracts/generated/"
