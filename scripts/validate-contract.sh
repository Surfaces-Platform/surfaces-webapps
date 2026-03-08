#!/usr/bin/env sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INTERFACECTL_BIN="$REPO_ROOT/tools/interfacectl/packages/interfacectl-cli/dist/index.js"

# Check if interfacectl is already built
if [ ! -f "$INTERFACECTL_BIN" ]; then
  echo "interfacectl CLI not found. Run from repo root: pnpm run interfacectl:build"
  echo "Ensure tools/interfacectl is present (git submodule update --init --recursive)."
  exit 1
fi

# Run validation
echo "Validating interface contracts..."
cd "$REPO_ROOT" && node "$INTERFACECTL_BIN" validate \
  --root "$REPO_ROOT" \
  --contract "$REPO_ROOT/contracts/surfaces.web.contract.json" \
  --format json

echo "Validating elevated-card policy..."
cd "$REPO_ROOT" && node "$REPO_ROOT/scripts/check-elevated-cards.mjs" \
  --workspace-root "$REPO_ROOT" \
  --contract "$REPO_ROOT/contracts/surfaces.web.contract.json" \
  --config "$REPO_ROOT/interfacectl.config.json" \
  --format json
