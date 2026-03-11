#!/usr/bin/env sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_BIN="${NODE_BIN:-node}"
INTERFACECTL_BIN="${INTERFACECTL_BIN:-}"

command -v "$NODE_BIN" >/dev/null 2>&1 || {
  echo "Node binary not found: $NODE_BIN" >&2
  exit 1
}

if [ -z "$INTERFACECTL_BIN" ]; then
  INTERFACECTL_BIN="$("$NODE_BIN" "$REPO_ROOT/scripts/interfacectl-tool.mjs" path cli)"
fi

# Run validation
echo "Validating interface contracts against the shared interfacectl baseline..."
cd "$REPO_ROOT" && "$NODE_BIN" "$INTERFACECTL_BIN" validate \
  --root "$REPO_ROOT" \
  --contract "$REPO_ROOT/contracts/surfaces.web.contract.json" \
  --format json

echo "Validating Surfaces-specific elevated-card policy..."
cd "$REPO_ROOT" && "$NODE_BIN" "$REPO_ROOT/scripts/check-elevated-cards.mjs" \
  --workspace-root "$REPO_ROOT" \
  --contract "$REPO_ROOT/contracts/surfaces.web.contract.json" \
  --config "$REPO_ROOT/interfacectl.config.json" \
  --format json
