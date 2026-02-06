#!/bin/bash
# Check Vercel deployment status after code changes.
# Derives production URLs from contracts/surfaces.web.contract.json.
# Usage: ./scripts/check-vercel-deployments.sh [project-url]
#   With no args: checks all surfaces from contract.
#   With URL: checks that URL only.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACT="$REPO_ROOT/contracts/surfaces.web.contract.json"

if [ -n "$1" ]; then
  PROJECTS=("$1")
else
  if [ ! -f "$CONTRACT" ]; then
    echo "Contract not found: $CONTRACT"
    exit 1
  fi
  if ! command -v jq &>/dev/null; then
    echo "jq is required. Install with: brew install jq"
    exit 1
  fi
  PROJECTS=()
  while IFS= read -r url; do
    [ -n "$url" ] && PROJECTS+=("$url")
  done < <(jq -r '.surfaces[].domain | "https://" + .' "$CONTRACT")
fi

echo "=== Vercel Deployment Status Check ==="
echo "Timestamp: $(date)"
echo ""

for url in "${PROJECTS[@]}"; do
  echo "--- $(basename "$url") ---"
  vercel inspect "$url" 2>&1 | grep -E "status|created|target|id|url" | head -6
  echo ""
done
