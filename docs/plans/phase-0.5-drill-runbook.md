# Phase 0.5 drill: ship, spot-check, revert

**Scope:** SurfaceOps UI phase. Independent of interfacectl CLI phase numbering.

**Status:** Completed. Drill runbook; drill executed and reverted.

**Goal:** Use the temporary `/auth/register` expectation to force a deterministic failure in production so we can verify Phase 3 and Phase 5 UI. Then remove the drill everywhere.

**Stop condition:** Do not leave `expectsAuthRegisterRoute` in main after the spot-check.

---

## A) Ship the drill

### 1. Open PRs

1. **interfacectl PR:** schema + validate-extracted rule for `expectsAuthRegisterRoute` and finding `phase0.authRoutes.register.missing`
2. **surfaces-webapps PR:** contract flag + SurfaceOps mirrored logic + contract schema update

### 2. Merge order

1. Merge interfacectl PR first
2. Bump `surfaces-webapps/tools/interfacectl` submodule to the interfacectl merge SHA
3. Merge surfaces-webapps PR

### 3. Confirm CI is green on surfaces-webapps main

---

## B) Production spot-check (after deploy)

1. Log in to https://www.surfaceops.ai
2. Navigate to `/contracts/surfaces-web`
3. Confirm all of the following are visible and correct:
   - Status is **fail**
   - Drift label behavior is correct for available history
   - **"Why this failed"** shows a finding under **"Auth routes"**
     - Code: `phase0.authRoutes.register.missing`
     - Expected vs found renders
   - **"Next steps"** appears
     - "Where to fix" is "Application code, Contract definition"
     - Guidance line is present and matches the mapping
4. Optional quick sanity:
   - `/` loads logged out
   - `/contracts` prompts for auth logged out

---

## C) Revert the drill immediately

Create revert PRs (same order), or do a single revert per repo and merge quickly.

### 1. surfaces-webapps revert

1. Remove `expectsAuthRegisterRoute` from `contracts/surfaces.web.contract.json`
2. Remove it from `contracts/web.surface.contract.schema.json`
3. Remove SurfaceOps logic in `apps/surfaceops-web/lib/contracts.ts`:
   - `PolicySurface.phase0` field
   - `computeValidationStatus` branch
   - `computeFindings` branch
   - category mapping in `getFindingCategory`
   - guidance mapping in `getActionGuidance`
   - intervention mapping in `getInterventionPoint`
4. Verify locally:
   ```bash
   pnpm run interfacectl:build
   pnpm run generate:contract
   INTERFACECTL_BIN="$(pnpm -s run interfacectl:bin)"
   node "$INTERFACECTL_BIN" validate-extracted --contract ./contracts/surfaces.web.contract.json --extracted ./contracts/generated/surfaces-web.extraction.json --surface surfaces-web --exit-codes v2
   # Expected: exit 0
   git diff --exit-code contracts/generated/
   # Expected: exit 0 (no changes)
   ```

### 2. interfacectl revert

1. Remove schema property `expectsAuthRegisterRoute` from `packages/interfacectl-validator/src/schema/web.surface.contract.schema.json`
2. Remove validate-extracted expectation plumbing and the rule in `packages/interfacectl-cli/src/commands/validate-extracted.ts`:
   - `Phase0Expectations` field
   - `getPhase0ForSurface` return value
   - `compare()` rule block
3. Run `pnpm test` and `pnpm run build`

### 3. surfaces-webapps submodule bump

1. Update `tools/interfacectl` to the interfacectl revert merge SHA
2. Verify CI is green again

---

## D) Close-out note

In surfaces-webapps, add one short entry to `docs/plans/phase-5-close-out.md`:

```
- [YYYY-MM-DD] Phase 0.5 drill: finding `phase0.authRoutes.register.missing`, spot-check passed, drill removed.
```
