#!/bin/bash
# Monitor GitHub Actions and Vercel during commits and redeploys.
# Usage: ./scripts/monitor-commit-redeploy.sh [--watch [interval_sec]]
#   No args: one-shot status
#   --watch: poll every interval_sec (default 60) until Ctrl+C

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

WATCH=false
INTERVAL=60
if [ "$1" = "--watch" ]; then
  WATCH=true
  [ -n "$2" ] && INTERVAL="$2"
fi

run_check() {
  echo ""
  echo "=============================================="
  echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "=============================================="

  # GitHub
  echo ""
  echo "--- GitHub Actions ---"
  if command -v gh &>/dev/null; then
    if gh auth status &>/dev/null; then
      gh run list --limit 5 2>/dev/null || echo "  (no workflow runs)"
      echo ""
      gh pr status 2>/dev/null || true
    else
      echo "  gh not authenticated"
    fi
  else
    echo "  gh not installed"
  fi

  # Vercel (from surfaces-webapps contract)
  echo ""
  echo "--- Vercel ---"
  if [ -f "scripts/monitor-vercel.sh" ]; then
    ./scripts/monitor-vercel.sh 2>/dev/null || echo "  (vercel inspect failed or not linked)"
  else
    echo "  Run from surfaces-webapps root"
  fi

  echo ""
}

if [ "$WATCH" = true ]; then
  echo "Monitoring every ${INTERVAL}s. Ctrl+C to stop."
  while true; do
    run_check
    sleep "$INTERVAL"
  done
else
  run_check
fi
