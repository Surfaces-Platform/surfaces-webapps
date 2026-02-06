# Phase 3A/3B Hardening — Failure Explainability & Drift Narrative

## Summary

Makes the "Why this failed" section and drift labeling trustworthy and non-misleading, with correct empty states and minimal drift-safety metadata.

## Changes

### A) Drift-label fallback semantics
- Narrative labels (Newly failing / Regressed / Persistently failing) only appear when `validation-outcomes.json` exists **and** the surface has at least 2 outcomes.
- When outcomes are missing or &lt; 2 entries and status is fail: show "Failing".
- When status is pass/unknown: no drift label.

### B) Empty-state for failures with no findings
- "Why this failed" section always renders when status is fail.
- If findings array is empty: show "No findings available for this failure."
- No advice or next steps in the message.
- Change log section unchanged and visible.

### C) Category naming (Phase 0.5 semantics)
- Renamed "Routes" to "Auth routes" everywhere.
- Auth route finding codes (`phase0.authRoutes.missing`) map to "Auth routes" category.

### D) Drift-safety metadata
- In Change log section: added "SurfaceOps build: &lt;short sha&gt;" from `VERCEL_GIT_COMMIT_SHA` when present, else "unknown".
- Added "interfacectl: &lt;short sha&gt;" — currently "unknown" with TODO for build-time injection if needed. No git at runtime on Vercel.

### E) Guardrail for mismatched states
- When status is fail and findings are empty: secondary line "Details not available for this failure."
- No codes shown unless findings exist.

## Acceptance tests (manual verification)

1. **Pass surface:** No "Why this failed" section.
2. **Fail surface with findings:** "Why this failed" shows grouped findings with expected vs found; drift label only when history exists (validation-outcomes.json + ≥2 outcomes).
3. **Fail surface with no findings:** "Why this failed" shows neutral empty state; no drift narrative beyond "Failing" if no history.
4. **validation-outcomes.json missing:** Drift label does not claim Newly failing / Regressed / Persistently failing.
5. **Category label:** Reads "Auth routes" not "Routes".
