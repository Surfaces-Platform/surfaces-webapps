# Feature Plan

## Summary
Align SurfaceOps demo scripts with the neutral `reference-target-web` fixture so demo runs and run-history correlation no longer depend on dogfood behavior from `surfaces-web`. This updates the CI/CD time and Runtime (edge) demo defaults, while keeping generation-time demo behavior unchanged.

## Strategy alignment
This change strengthens the decision filter by proving enforcement behavior on a deterministic fixture surface. It reduces ambiguity in demos, making it clear when a change is allowed, blocked, or signaled by contract policy instead of app-specific dogfood drift.

Decision filter sentence
"When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent."

## Contract impact
1. Contract definition
No canonical contract semantics are changed. Demo scripts now default to generated `reference-target-web` artifacts and runtime manifest slices for that surface.

2. Enforcement timing
This affects `CI/CD time` demo execution and `Runtime (edge)` demo execution paths.

3. Violation handling
`CI/CD time`: malformed extracted artifact is blocked and surfaced with `phase0.load.extracted`.
`Runtime (edge)`: missing section is blocked (`sections.required`), color values outside allowlist are surfaced as `color.disallowed` and block only when policy is `strict`.

## Surface impact
This change affects:
- `surfaceops.ai`: run-history/demo correlation now points to `reference-target-web` for CI/runtime demo flows.
- `surfaces.systems`: generation-time demo remains unchanged.
- `interfacectl`: no semantic/tooling changes in this repo pass.

## Non-goals
- No change to interfacectl schema or validator semantics.
- No change to production contract authority model.
- No migration of generation-time demo surface from `surfaces-web`.

## Acceptance criteria
1. `demo-ci-surfaceops.sh` defaults to `reference-target-web` artifacts.
2. `demo-runtime-surfaceops.sh` defaults to `reference-target-web` and port `3004`.
3. Runtime demo emits `color.disallowed` (not split-model color rules).
4. Reference target exposes `/adaptive/*` runtime test route and edge proxy behavior.
5. `scripts/__tests__/demo-scripts.test.mjs` passes with updated demo defaults.
6. `docs/demos/surfaces-platform-visual-runbook.md` reflects reference-target preconditions and SurfaceOps detail links.

## Risks and drift checks
1. Risk: demo scripts drift from generated reference artifacts.
Mitigation: CI script auto-generates reference-target artifacts if missing.

2. Risk: runtime demo reintroduces legacy split color policy semantics.
Mitigation: runtime proxy and runtime script use unified `color.policy + color.allowedValues`.

3. Risk: demo assertions become observability-only and stop proving enforcement.
Mitigation: keep deterministic blocked paths in both CI/CD time and Runtime (edge) flows with explicit failure codes/rules.

## Implementation outline
1. Update SurfaceOps CI/runtime demo defaults to `reference-target-web`.
2. Update CI demo synthetic failure from phase mismatch to malformed extraction load failure.
3. Add `reference-target-web` `/adaptive/*` runtime test route and proxy enforcement.
4. Generate and commit `reference-target-web` runtime manifest artifact.
5. Update demo tests and runbook documentation.
