#!/usr/bin/env bash
# Phase 2: After merging interfacectl schema PR, run this from surfaces-webapps repo root.
# Uses gh CLI. Fetches interfacectl merge SHA from origin/main, then submodule update, open PR, watch, merge, verify.

set -e

cd /Users/mike/Cursor/surfaces-webapps

# --- Get interfacectl merge SHA from origin/main (only after you merge the schema PR) ---
echo "Fetching interfacectl origin/main..."
(cd tools/interfacectl && git fetch origin)
INTERFACECTL_MERGE_SHA=$(cd tools/interfacectl && git log origin/main -1 --format=%H)
echo "interfacectl origin/main SHA: $INTERFACECTL_MERGE_SHA"

# Only update submodule if main has the owner schema (avoid pointing at older main before merge)
SCHEMA_HAS_OWNER=$(cd tools/interfacectl && git show origin/main:packages/interfacectl-validator/src/schema/web.surface.contract.schema.json 2>/dev/null | grep -q '"owner"' && echo yes || echo no)
if [[ "$SCHEMA_HAS_OWNER" == "yes" && "$INTERFACECTL_MERGE_SHA" != "16e754a" ]]; then
  echo "Updating submodule to merge SHA $INTERFACECTL_MERGE_SHA..."
  git checkout feat/surfaceops-phase-2
  cd tools/interfacectl && git checkout "$INTERFACECTL_MERGE_SHA" && cd ../..
  git add tools/interfacectl
  git diff --staged --quiet || { git commit -m "chore: point interfacectl submodule at merge SHA"; git push; }
  cd /Users/mike/Cursor/surfaces-webapps
elif [[ "$SCHEMA_HAS_OWNER" != "yes" ]]; then
  echo "interfacectl main does not have owner schema yet. Merge the interfacectl schema PR first; submodule stays at 16e754a."
else
  echo "Submodule already at 16e754a; no update needed."
fi

# --- Open Phase 2 PR if not already open ---
PR_EXISTS=$(gh pr list --head feat/surfaceops-phase-2 --json number -q '.[0].number' 2>/dev/null || true)
if [[ -z "$PR_EXISTS" ]]; then
  echo "Creating Phase 2 PR..."
  gh pr create --base main --head feat/surfaceops-phase-2 \
    --title "feat(surfaceops): phase 2 ownership, change awareness, outcome history" \
    --body "Phase 2 — SurfaceOps durability & ownership. B + C in one PR. See docs/plans/phase-2-ship-plan.md."
  PR_NUMBER=$(gh pr list --head feat/surfaceops-phase-2 --json number -q '.[0].number')
else
  PR_NUMBER="$PR_EXISTS"
  echo "PR already exists: #$PR_NUMBER"
fi

# --- Watch checks, then squash merge ---
echo "Watching checks for PR #$PR_NUMBER..."
gh pr checks "$PR_NUMBER" --watch
echo "Squash merging PR #$PR_NUMBER..."
gh pr merge "$PR_NUMBER" --squash

# --- Post-merge verification on main ---
echo "Post-merge verification on main..."
git checkout main
git pull
git submodule update --init --recursive
pnpm install --frozen-lockfile
pnpm run interfacectl:build
pnpm run generate:contract
git diff --exit-code contracts/generated/ || { echo "::error::Generated contract drift. Run pnpm run generate:contract and commit."; exit 1; }
pnpm validate:local

echo "Done. UI spot check: 1) / unauthenticated  2) /contracts prompts auth  3) List: owner, status, dots  4) Detail: owner, last contract change, last extraction run"
