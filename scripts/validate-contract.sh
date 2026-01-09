#!/usr/bin/env sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INTERFACECTL_DIR="/Users/mike/Cursor/interfacectl"
INTERFACECTL_BIN="$INTERFACECTL_DIR/packages/interfacectl-cli/dist/index.js"

# Check if interfacectl is already built
if [ ! -f "$INTERFACECTL_BIN" ]; then
  echo "interfacectl CLI not found. Building development interfacectl..."

  if [ ! -d "$INTERFACECTL_DIR" ]; then
    echo "Error: Development interfacectl not found at $INTERFACECTL_DIR"
    echo "Make sure the interfacectl repository is available at that path."
    exit 1
  fi

  echo "Installing interfacectl dependencies..."
  cd "$INTERFACECTL_DIR"
  pnpm install || {
    echo "Error: Failed to install interfacectl dependencies"
    exit 1
  }

  echo "Building interfacectl..."
  pnpm run build || {
    echo "Error: Failed to build interfacectl"
    exit 1
  }

  cd "$REPO_ROOT"
fi

# Run validation
echo "Validating interface contracts..."
node "$INTERFACECTL_BIN" validate \
  --root "$REPO_ROOT" \
  --contract "$REPO_ROOT/contracts/surfaces.web.contract.json" \
  --format json
