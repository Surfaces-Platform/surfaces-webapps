# Phase 2 Ship Plan — SurfaceOps

**Scope:** SurfaceOps UI phase. Independent of interfacectl CLI phase numbering.

**Status:** Ready to ship. All verification steps pass.

---

## A) interfacectl PR (canonical schema)

**Note:** Any contract schema changes referenced here are implemented in interfacectl and consumed by surfaces-webapps. This document does not define or modify schema semantics.

### 1. Schema change verified
- **File:** `packages/interfacectl-validator/src/schema/surfaces.web.contract.schema.json`
- **Change:** Additive only — `surfaces[].owner` as optional string
- **Verification:** `pnpm install && pnpm test && pnpm run build` ✅

### 2. Create PR in Surfaces-Platform/interfacectl

```bash
cd /Users/mike/Cursor/interfacectl

git checkout main
git pull
git checkout -b feat/schema-surface-owner

# Stage schema source only (do not commit dist)
git add packages/interfacectl-validator/src/schema/surfaces.web.contract.schema.json

git commit -m "feat(schema): add optional surface owner"
git push -u origin feat/schema-surface-owner
```

**PR Title:** `feat(schema): add optional surface owner`

**PR Body:**
```
Add additive `surfaces[].owner` field for SurfaceOps Phase 2 ownership display.

No behavior change in extractor or validator logic.
```

### 3. Merge interfacectl PR
Record merged SHA for step B.

---

## B) surfaces-webapps submodule bump

**Do this after merging the interfacectl PR.**

```bash
cd /Users/mike/Cursor/surfaces-webapps

cd tools/interfacectl
git checkout main
git pull
git checkout <merged_sha>
cd ../..

git add tools/interfacectl
git commit -m "chore: bump interfacectl submodule for owner schema"
```

**Merge plan:** Put B and C in the same PR so CI sees the bumped submodule and the UI changes together.

---

## C) surfaces-webapps Phase 2 PR

### 1. Changes verified

| Requirement | Files | Status |
|-------------|-------|--------|
| **1. Owner** | `contracts/surfaces.web.contract.schema.json`, `contracts/surfaces.web.contract.json`, `apps/surfaceops-web/app/contracts/page.tsx`, `apps/surfaceops-web/app/contracts/[surfaceId]/page.tsx` | ✅ |
| **2. Change awareness** | `apps/surfaceops-web/lib/contracts.ts` (`getLastContractChange`, `getLastExtractionRun`), detail page | ✅ |
| **3. Repeated outcomes** | `apps/surfaceops-web/lib/contracts.ts` (`loadValidationOutcomes`), list + detail UI dots | ✅ |
| **4. Public vs auth** | `apps/surfaceops-web/app/(overview)/page.tsx` — copy only, no auth | ✅ |
| **5. UX guardrails** | `@surfaces/ui` tokens, no new components | ✅ |

### 2. Verification (passed)

```bash
git submodule update --init --recursive
pnpm install --frozen-lockfile
pnpm run interfacectl:build

# Ensure INTERFACECTL_BIN is set locally
INTERFACECTL_BIN="$(pnpm -s run interfacectl:bin)"

pnpm run generate:contract
node "$INTERFACECTL_BIN" validate-extracted --contract ./contracts/surfaces.web.contract.json --extracted ./contracts/generated/surfaces-web.extraction.json --surface surfaces-web --exit-codes v2

# Stop condition: never edit generated JSON by hand. If this fails, the only allowed fix is:
# run pnpm run generate:contract, then commit the regenerated artifacts (or revert the triggering change)
git diff --exit-code contracts/generated/

pnpm type-check
pnpm validate:local
```

### 3. PR content

**Title:** `feat(surfaceops): phase 2 ownership, change awareness, and outcome history`

**Body:**
```markdown
## Phase 2 — SurfaceOps Durability & Ownership

### Requirements
- [x] **Requirement 1 (owner):** Contract + schema + list/detail UI
- [x] **Requirement 2 (change awareness):** lib git-log helpers + detail UI
- [x] **Requirement 3 (repeated outcomes):** Optional validation-outcomes.json + dots UI
- [x] **Requirement 4 (public vs auth):** Overview copy only
- [x] **Requirement 5 (UX guardrails):** @surfaces/ui tokens, no new components

### Dependencies
- Depends on interfacectl PR with `surfaces[].owner` schema (merged)
- Submodule bump: `tools/interfacectl` → merged interfacectl SHA
```

---

## D) Hard rules (confirmed)

1. **No CI requirement for `validation-outcomes.json`** — ✅ `.github/workflows/validate-contract.yml` does not reference it
2. **No generator script in CI** — ✅ No script exists; optional file documented in Phase 2 summary only
3. **No new product scope** — ✅ Phase 2 only

---

## Deliverables summary

| Item | Status |
|------|--------|
| interfacectl PR link | _Create after merge_ |
| interfacectl merged SHA | _Record after merge_ |
| surfaces-webapps PR link | _Create after submodule bump_ |
| Checks green | ✅ type-check, validate:local, validate-extracted |
| No generated drift | ✅ |
| Overview public, /contracts auth-gated | ✅ |
