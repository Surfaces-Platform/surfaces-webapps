#!/bin/bash
# Monitor Vercel deployment status after code changes.
# Derives production URLs from contracts/surfaces.web.contract.json.
# Usage: ./scripts/monitor-vercel.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACT="${CONTRACT_OVERRIDE:-$REPO_ROOT/contracts/surfaces.web.contract.json}"

if [ -n "$PROJECTS_OVERRIDE" ]; then
  IFS=',' read -r -a PROJECTS <<< "$PROJECTS_OVERRIDE"
else
  if [ ! -f "$CONTRACT" ]; then
    echo "Contract not found: $CONTRACT"
    exit 1
  fi

  if ! command -v jq &>/dev/null; then
    echo "jq is required. Install with: brew install jq"
    exit 1
  fi

  # Build name:url pairs from contract (name = domain without www)
  PROJECTS=()
  while IFS= read -r line; do
    [ -n "$line" ] && PROJECTS+=("$line")
  done < <(jq -r '.surfaces[] | "\(.domain | ltrimstr("www.")):https://\(.domain)"' "$CONTRACT")
fi

echo "=== Vercel Deployment Status Monitor ==="
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

for project_info in "${PROJECTS[@]}"; do
  IFS=':' read -r name url <<< "$project_info"
  echo "--- $name ---"
  
  output=$(vercel inspect "$url" 2>&1)
  
  status=$(echo "$output" | grep "status" | sed -n 's/.*status[[:space:]]*[^[:space:]]*[[:space:]]*\([A-Za-z]*\).*/\1/p' | head -1)
  [ -z "$status" ] && status="Unknown"
  
  created=$(echo "$output" | grep "created" | sed -n 's/.*created[[:space:]]*\([^[]*\).*/\1/p' | head -1)
  [ -z "$created" ] && created="Unknown"
  
  deployment_id=$(echo "$output" | grep "id" | sed -n 's/.*id[[:space:]]*\([a-zA-Z0-9_]*\).*/\1/p' | head -1)
  [ -z "$deployment_id" ] && deployment_id="N/A"
  
  target=$(echo "$output" | grep "target" | sed -n 's/.*target[[:space:]]*\([a-zA-Z]*\).*/\1/p' | head -1)
  [ -z "$target" ] && target="Unknown"
  
  if [ "$status" = "Ready" ]; then
    status_icon="✅"
  elif [ "$status" = "Building" ] || [ "$status" = "Queued" ]; then
    status_icon="🔄"
  elif [ "$status" = "Error" ] || [ "$status" = "Failed" ]; then
    status_icon="❌"
  else
    status_icon="⚠️"
  fi
  
  echo "  Status: $status_icon $status"
  echo "  Target: $target"
  echo "  Deployment ID: $deployment_id"
  echo "  Created: $created"
  echo ""
done
