#!/usr/bin/env sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INTERFACECTL_DIR="$REPO_ROOT/interfacectl-tooling"
INTERFACECTL_BIN="$INTERFACECTL_DIR/packages/interfacectl-cli/dist/index.js"

# Check if interfacectl is already built
if [ ! -f "$INTERFACECTL_BIN" ]; then
  echo "interfacectl CLI not found. Setting up..."

  # Check if directory exists but isn't built
  if [ ! -d "$INTERFACECTL_DIR" ]; then
    echo "Cloning interfacectl repository..."
    git clone --depth 1 https://github.com/Surfaces-Platform/interfacectl.git "$INTERFACECTL_DIR" || {
      echo "Error: Failed to clone interfacectl repository"
      echo "Make sure you have access to the repository and git is configured."
      exit 1
    }
  fi

  echo "Installing interfacectl dependencies..."
  cd "$INTERFACECTL_DIR"
  pnpm install --frozen-lockfile || {
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
