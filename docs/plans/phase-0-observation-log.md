# Phase 0 Observation Log

Lightweight log of running the Phase 0 loop. Add entries when something breaks, feels awkward, or creates friction. Do not add new rules yet—collect signal.

## Template for entries

```markdown
### YYYY-MM-DD — [Brief title]

**Trigger:** PR | refactor | dependency update | manual test
**First guess:** What you thought would happen before running
**What happened:**
**Failure mode (if any):**
**Finding code:** (e.g. phase0.designSystem.missing)
**Time to diagnose:** rough minutes
**Next action clarity:** clear | somewhat clear | unclear
**Did it point to:** code | contract | both | neither
**Fair or surprising?**
**Contract felt like:** documentation | tax
**Confidence in the signal:** high | medium | low
**Wish we could assert:**
```

---

## 2025-02-05 — Design system drift (realistic code change)

**Trigger:** manual test
**First guess:** Changing @surfaces/ui imports to relative paths would cause extractor to miss design-system usage; validate-extracted would fail.
**What happened:** Replaced `@surfaces/ui` imports in `apps/surfaces-web/app/page.tsx` with relative paths (`../../../packages/ui/src/...`). App still runs. Extractor no longer finds `@surfaces/ui` in that file, so `designSystemComponents` became `[]`.
**Failure mode (if any):** `validate-extracted` exited 30 (E2).
**Finding code:** `phase0.designSystem.missing`
**Key failure output:**
```
[surfaces-web] phase0.designSystem.missing (E2): Contract expects design-system usage but extraction found none.
  expected: "at least one component"
  found: []
```
**Time to diagnose:** &lt;2 min
**Next action clarity:** clear — either restore `@surfaces/ui` imports in code or relax `expectsDesignSystem` in contract.
**Did it point to:** code (the import change caused the mismatch; contract expectation was correct)
**Fair or surprising?** Fair. Message names the surface, the code, expected vs found.
**Contract felt like:** documentation — contract correctly reflects intent; code drifted.
**Confidence in the signal:** high
**Wish we could assert:** (none yet)

---

## 2025-02-05 — Execution test (baseline + synthetic stress)

**Trigger:** manual test
**First guess:** Simulating empty designSystemComponents would trigger phase0.designSystem.missing.
**What happened:** Ran full loop: generate-contract → validate-extracted → validate. Baseline: all green. Simulated design-system violation (edited extraction JSON directly) to observe failure path.
**Failure mode (if any):** `validate-extracted` exited 30 (E2) with same message as above.
**Finding code:** `phase0.designSystem.missing`
**Time to diagnose:** &lt;1 min (synthetic; no real code change)
**Next action clarity:** clear
**Did it point to:** neither (synthetic edit of artifact)
**Fair or surprising?** Fair. Message is clear; code and expected/found are explicit.
**Contract felt like:** documentation (baseline); not tested under real drift yet.
**Confidence in the signal:** high (for synthetic case)
**Wish we could assert:** (none yet—first run)

**Extraction warnings (expected):** `requiredSections.omitted`, `allowedFonts.default`, `layout.default` — all documented Phase 0 omissions.

---

## 2025-02-05 — Phase 1 SurfaceOps UI implementation

**Trigger:** Phase 1 implementation
**First guess:** Simplified landing + /contracts + /contracts/[surfaceId] would satisfy contract; auth at route level for /contracts.
**What happened:** Built minimal SurfaceOps UI. Landing (/) public; /contracts and /contracts/[surfaceId] auth-required via layout. Contract list reads from surfaces.web.contract.json; detail page shows phase0, extracted signals, validation status. Only surfaces-web has extraction data; others show "unknown".
**Failure mode (if any):** None. Initial validate failed because simplified landing lacked data-contract-section and contract-container; added minimal sections to comply.
**Finding code:** —
**Time to diagnose:** &lt;5 min
**Next action clarity:** clear
**Did it point to:** code (add sections to satisfy contract)
**Fair or surprising?** Fair. Contract expected sections; we had removed them when simplifying.
**Contract felt like:** documentation — contract correctly describes what surfaces must have.
**Confidence in the signal:** high
**Wish we could assert:** (none yet)

---

## 2025-02-05 — Real friction loop (auth route removed)

**Trigger:** manual test — Phase 1 pre-advance check
**First guess:** Removing `/auth/logout` from surfaceops-web would cause extraction to miss the route; SurfaceOps UI would show fail.
**What happened:** Deleted `apps/surfaceops-web/app/auth/logout/route.ts`. Ran `generate:contract:all`. Extraction correctly showed routes without `/auth/logout`. SurfaceOps UI would show surfaceops-web as **fail** (computeValidationStatus checks required auth routes). Restored route and regenerated.
**Failure mode (if any):** N/A — UI would show fail; did not run SurfaceOps in browser.
**Finding code:** expectsAuthRoutes → required route missing
**Time to diagnose:** &lt;2 min
**Next action clarity:** clear — restore the route or add it.
**Did the UI point you to the problem?** Yes — SurfaceOps list would show "fail" for surfaceops-web; detail would show pass/fail with extraction data. The Phase 0 expectations section explains what the extractor checks; extracted signals would show routes without `/auth/logout`. A human could infer the missing route.
**Did the contract feel like documentation or bureaucracy?** Documentation. The contract says "expects auth routes"; extraction shows what was found. No extra process.
**Did you know what to do next without thinking?** Yes — either add the route back or relax the expectation.
**Surprising:** `validate:local` (interfacectl validate) passed. It checks structural/semantic compliance (sections, fonts, layout), not Phase 0 extraction. Phase 0 checks live in validate-extracted and in SurfaceOps UI. So: CLI validate ≠ SurfaceOps UI. An engineer running `pnpm validate:local` could see green while SurfaceOps shows fail. The SurfaceOps UI is the operational source of truth for Phase 0.
**Verdict:** Yes, this would help in a real repo. Clear signal, actionable, no magic.
