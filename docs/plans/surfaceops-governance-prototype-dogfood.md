# Feature Plan

## Summary
This feature introduces a protected governance workspace prototype at `/contracts/governance` inside `surfaceops-web`. The workspace allows visual authoring of layout, navigation, generation, and drift rules while keeping a synchronized JSON contract with live validation and simulated impact findings. The current `/contracts` and `/contracts/runs` onboarding and run-history flows remain intact. Dogfooding includes real static extraction of `surfaces.systems` (`apps/surfaces-web`) using `interfacectl generate-contract`.

## Strategy alignment
This work strengthens the decision filter by turning policy intent into explicit, executable constraints and immediate violation feedback in a governance-first UI. It proves that agent-facing UI constraints can be authored without raw JSON editing while preserving deterministic contract representation and blocking semantics for invalid contracts.

Decision filter sentence
"When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent."

## Contract impact
1. Contract definition
- Adds an internal UI contract model for governance authoring (local to `surfaceops-web` route components): `surface`, `version`, `layout`, `navigation`, `generation`, `drift`.
- Rule-level enums are bounded to `required | allowed | forbidden`.
- Adds local JSON schema validation for the prototype contract shape.
- No change to canonical platform contract schema or `contracts/surfaces.web.contract.json` semantics.

2. Enforcement timing
- `Generation time`: governance workspace authors constraints and keeps structured and JSON views synchronized.
- `CI/CD time`: dogfood extraction is executed using `interfacectl generate-contract` and checked with `interfacectl validate-extracted`.
- `Runtime (edge)`: no new runtime behavior in this slice.

3. Violation handling
- Invalid JSON/schema violations are signaled immediately in the workspace.
- Publish action is blocked when blocking validation findings exist.
- Simulation violations are signaled as predicted impact and do not independently gate publish.

## Surface impact
- `surfaceops.ai`: primary surface for this feature (new `/contracts/governance` route).
- `surfaces.systems`: used as extraction dogfood input via `apps/surfaces-web` for static contract generation artifacts.
- `interfacectl`: used as extraction and validation tooling only; no CLI behavior changes.

## Non-goals
- No replacement of existing `/contracts` or `/contracts/runs` pages.
- No backend extraction refactor in onboarding API.
- No changes to runtime (edge) adapters or enforcement pipeline behavior.
- No schema changes to canonical `surfaces.web.contract.json`.

## Acceptance criteria
1. `/contracts/governance` renders within existing `/contracts` auth layout protections.
2. The governance workspace is three-column with left rail, center builder tabs, and right contract panel.
3. Tabs (`Layout`, `Navigation`, `Generation`, `Drift`) preserve state when switched.
4. Structured view and JSON view stay synchronized.
5. Invalid JSON or schema violations are surfaced clearly and disable publish.
6. Drift detection options are limited to `onCommit` and `onBuild`.
7. Surface selector options are limited to `app`, `marketing`, `admin`, and `cli`.
8. Contract version options are limited to `draft`, `active`, and `proposed`.
9. `/contracts` includes a clear CTA linking to `/contracts/governance`.
10. `interfacectl generate-contract` and `validate-extracted` run successfully for `surfaces-web` artifacts.

## Risks and drift checks
1. Risk: workspace drifts into dashboard/observability framing rather than governance.
- Mitigation: keep controls contract-field-centric and enforce publish gating on validation.
2. Risk: prototype style diverges into marketing-like visuals that weaken system intent.
- Mitigation: route-scoped neutral visual system with low ornamentation and dense readable layout.
3. Risk: dogfood extraction becomes synthetic rather than real code extraction.
- Mitigation: run `generate-contract` directly on `apps/surfaces-web` and persist generated artifacts.

## Implementation outline
1. Add this feature plan document under `docs/plans/`.
2. Create route `apps/surfaceops-web/app/contracts/governance/page.tsx`.
3. Add governance prototype component tree under `app/contracts/governance/_components/*`.
4. Add local contract model/schema/validator/simulator under `app/contracts/governance/_lib/*`.
5. Use route-scoped CSS module to avoid global style collisions.
6. Add CTA link from `apps/surfaceops-web/app/contracts/page.tsx` to `/contracts/governance`.
7. Run `interfacectl:build`, `generate-contract`, and `validate-extracted` for `surfaces-web`.
8. Run type-check and smoke/tests listed in verification criteria.
