# Feature Plan

## Summary
Promote `judgmentkit.ai` from an external-only dropdown link to a recognized site in the shared Surfaces navigation model. The shared header can now render JudgmentKit as the current surface and move between JudgmentKit and the other Surfaces sites in the same tab.

## Strategy alignment
This strengthens the decision filter by keeping the public JudgmentKit entrypoint inside the same governed site-switching interface as the rest of the Surfaces estate. A shared navigation contract makes the intended relationship explicit instead of relying on one-off site chrome.

Decision filter sentence
"When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent."

## Contract impact
1. Contract definition
The shared navigation contract adds `judgmentkit` as a valid site id with the invariant that it uses same-tab site switching. Context-preserving routes remain scoped to the existing Surfaces-owned sites.

2. Enforcement timing
CI/CD time applies through type checking and navigation tests. Runtime (edge) behavior is unchanged.

3. Violation handling
Navigation drift is signaled by failing tests or type checks before release.

## Surface impact
This affects `surfaces.systems`, `surfaceops.ai`, `interfacectl.com`, `surfaces.dev`, and `judgmentkit.ai` because they share the same site-switching model.

## Non-goals
This does not add contextual JudgmentKit deep-link mappings, iframe embedding, or a copied JudgmentKit-specific header.

## Acceptance criteria
- `currentSurface="judgmentkit"` is valid for the shared navigation component.
- `judgmentkit.ai` appears as the active dropdown item when JudgmentKit renders the shared header.
- `judgmentkit.ai` opens in the same tab from all shared nav instances.
- The JudgmentKit dropdown item has no `_blank`, `rel`, or pop-out icon treatment.
- Existing Surfaces site contextual routing remains unchanged.

## Risks and drift checks
- Risk: JudgmentKit drifts back into custom chrome. Mitigation: consume `@surfaces/ui` directly in the JudgmentKit app.
- Risk: same-tab behavior regresses. Mitigation: assert no `target` or `rel` attributes in tests.
- Risk: contextual routing expands without a product mapping. Mitigation: route JudgmentKit to root until a specific mapping is approved.

## Implementation outline
- Add `judgmentkit` to the shared navigation site id and domain map.
- Convert dropdown active checks to stable site ids.
- Route JudgmentKit same-tab through the shared domain resolver.
- Update tests for active state, same-tab behavior, and unchanged contextual routing.
