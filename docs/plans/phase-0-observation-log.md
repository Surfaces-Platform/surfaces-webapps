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
