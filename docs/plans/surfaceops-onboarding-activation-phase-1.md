# Feature Plan

## Summary
Implement a zero-to-one onboarding experience in SurfaceOps contracts view: when no activated surfaces exist, show an onboarding-first empty state and let users submit a URL to generate the first contract. Add onboarding API routes and activation-aware surface loading so the list is driven by generated/lineage artifacts rather than auto-populated canonical policy surfaces.

## Strategy alignment
This work makes first-run contract generation explicit, enforceable, and stateful instead of inferred from static policy lists. It strengthens the decision filter by requiring a concrete onboarding extraction event before a surface appears, and by recording run status in existing artifacts that already support downstream enforcement visibility.

Decision filter sentence
"When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent."

## Contract impact
1. Contract definition
No canonical policy schema change. Introduce activation resolution rules in SurfaceOps data layer based on generated extraction artifacts and run lineage.

2. Enforcement timing
- `Generation time`: onboarding API triggers extraction bootstrap and records status.
- `CI/CD time`: existing run-artifact validation compatibility preserved.
- `Runtime (edge)`: no change in this phase.

3. Violation handling
Failed onboarding returns actionable failure state and does not activate the surface. Partial writes are avoided by atomic file writes for generated artifacts/run metadata.

## Surface impact
- `surfaceops.ai`: primary UI and API changes.
- `interfacectl`: consumed indirectly through artifact-compatible generation flow.
- `surfaces.systems`: remains validation context source, not first-run list source.

## Non-goals
- Full embedded browser auth automation in web UI.
- Replacing existing runs/detail pages beyond compatibility adjustments.
- Runtime (edge) policy changes.

## Acceptance criteria
1. `/contracts` shows "No contracts yet" state when no activated surfaces exist.
2. Empty state includes clear primary CTA and URL input.
3. `POST /api/onboarding/extract` accepts onboarding payload and returns lifecycle state.
4. Successful onboarding creates generated artifacts and updates run/lineage artifacts.
5. Activated surface list renders from activation artifacts, not canonical surface enumeration.
6. Protected URL path supports browser-session auth mode metadata without storing raw tokens.
7. Failed onboarding does not create corrupted activation state.
8. Existing run artifact validation remains green.

## Risks and drift checks
1. Risk: list remains policy-driven and ignores onboarding activation.
Mitigation: centralize activated surface resolver in contracts lib and use it from `/contracts`.

2. Risk: onboarding writes break run artifact schema.
Mitigation: keep run/lineage document structure unchanged and validate with existing script.

3. Risk: auth metadata leaks sensitive values.
Mitigation: only store opaque references and redact session-like fields from API responses/logging.

## Implementation outline
1. Add activation resolver + onboarding write utilities in SurfaceOps contracts lib.
2. Add onboarding API endpoint and lifecycle states.
3. Add onboarding client component and empty-state flow in contracts page.
4. Update contracts list rendering to use activated surfaces.
5. Add/adjust tests for activation/onboarding behavior.
6. Run surfaceops tests and run-artifact validator.
