# Feature Plan

## Summary
`p0005` realigns governance inspector around a customer-first authority model by introducing a neutral reference target and explicit target modes (`reference` vs `BYO`). The inspector still supports arbitrary URLs, but now communicates reliability tier and confidence so heuristic checks do not present as deterministic truth.

## Strategy alignment
This work clarifies product authority and removes dogfood ambiguity from governance workflows. Customer contract state remains the source of truth; first-party sites are demo inputs only.

## Contract impact
1. Contract definition
- No persistence schema changes (`snapshot-index`, `decisions`, `applies`, `inspector-baselines`).
- New inspector URL parameters: `targetMode`, `targetProfile`.
- New reliability semantics in checker output (`full` vs `degraded`).

2. Enforcement timing
- `Generation time`: inspector check semantics and severity adaptation.
- `CI/CD time`: unchanged.
- `Runtime (edge)`: unchanged.

3. Violation handling
- Marker-dependent blocking checks downgrade to warning in degraded reliability mode.
- Violation rows expose `confidence` and `heuristic` metadata.

## Surface impact
- `surfaceops.ai`: inspector UX and defaults updated.
- `reference-target-web`: new neutral fixture app for deterministic governance demos.
- `surfaces.systems`: remains dogfood-only, no canonical-authority framing.

## Acceptance criteria
1. Inspector supports explicit `Reference` and `BYO` modes.
2. Default inspector target resolves from `NEXT_PUBLIC_GOVERNANCE_REFERENCE_TARGET_URL` (dev fallback to local fixture).
3. Reliability tier and reasons are visible in the inspector.
4. BYO mode runs in degraded reliability with marker-dependent blockers downgraded.
5. Demo script defaults to the neutral reference target workflow.
6. Active docs no longer frame `surfaces.systems` as canonical product authority.

## Implementation outline
1. Add inspector target registry and URL mode/profile parsing.
2. Replace hardcoded inspector defaults with env-backed reference profile.
3. Add reliability-tier model to checker + workspace UX.
4. Add `apps/reference-target-web` fixture target with deterministic markers and simulation flags.
5. Update governance demo script and docs to reference the neutral target model.
6. Validate via type-check and tests.
