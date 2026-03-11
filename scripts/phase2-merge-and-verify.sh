#!/usr/bin/env bash
# Phase 2: After merging the interfacectl schema PR, run this from the shared
# workspace. Uses the standalone sibling interfacectl repo rather than the
# vendored fallback mirror.

set -e

WORKSPACE_ROOT="/Users/mike/SurfacesPlatform"
SURFACES_REPO="$WORKSPACE_ROOT/surfaces-webapps"
INTERFACECTL_REPO="$WORKSPACE_ROOT/interfacectl"

cd "$SURFACES_REPO"

# --- Get interfacectl merge SHA from origin/main (only after you merge the schema PR) ---
echo "Fetching interfacectl origin/main..."
(cd "$INTERFACECTL_REPO" && git fetch origin)
INTERFACECTL_MERGE_SHA=$(cd "$INTERFACECTL_REPO" && git log origin/main -1 --format=%H)
echo "interfacectl origin/main SHA: $INTERFACECTL_MERGE_SHA"

SCHEMA_HAS_OWNER=$(cd "$INTERFACECTL_REPO" && git show origin/main:packages/interfacectl-validator/src/schema/web.surface.contract.schema.json 2>/dev/null | grep -q '"owner"' && echo yes || echo no)
if [[ "$SCHEMA_HAS_OWNER" != "yes" ]]; then
  echo "interfacectl main does not have owner schema yet. Merge the interfacectl schema PR first."
  exit 1
fi

echo "Using standalone interfacectl repo at $INTERFACECTL_REPO"

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
SURFACES_INTERFACECTL_ROOT="$INTERFACECTL_REPO" pnpm install --frozen-lockfile
SURFACES_INTERFACECTL_ROOT="$INTERFACECTL_REPO" pnpm run interfacectl:build
SURFACES_INTERFACECTL_ROOT="$INTERFACECTL_REPO" pnpm run generate:contract
git diff --exit-code contracts/generated/ || { echo "::error::Generated contract drift. Run pnpm run generate:contract and commit."; exit 1; }
SURFACES_INTERFACECTL_ROOT="$INTERFACECTL_REPO" pnpm validate:local

echo "Done. UI spot check: 1) / unauthenticated  2) /contracts prompts auth  3) List: owner, status, dots  4) Detail: owner, last contract change, last extraction run"
