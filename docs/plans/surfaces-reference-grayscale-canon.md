# Feature Plan

## Summary
Align the `/design-system` reference UI with the grayscale canon it documents. The route shell, navigation, cards, tables, specimens, and resource surfaces should use Surfaces brand primitives, while product semantic color remains limited to component and state examples.

## Strategy alignment
This strengthens the decision filter by making the public reference itself an example of allowed brand and product-system output. Builders and generated interfaces should not infer a second slate palette from the reference site chrome.

Decision filter sentence
"When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent."

## Contract impact
1. Contract definition
No schema changes. The visual reference contract is tightened so brand primitives shown in the foundations section are also used by the surrounding reference UI, and the `surfaces-web` color allowlist recognizes the approved grayscale and semantic variables.

2. Enforcement timing
Generation time and CI/CD time. Generation time guidance is clearer because the site demonstrates the approved palette; CI/CD time tests block old shell color values from returning.

3. Violation handling
Palette drift is signaled through regression tests and local visual review before deployment.

## Surface impact
- surfaces.systems: Updates only the `/design-system` reference UI palette.
- surfaceops.ai: No direct change.
- interfacectl: No direct change.

## Non-goals
- No logo redraw.
- No product token schema rename.
- No homepage, routing, or Runtime (edge) changes.
- No deployment.

## Acceptance criteria
- The reference shell no longer uses the old slate ramp.
- The UI uses Paper, Mist, White, Plane, Line, Ink, Graphite, Steel, and Ash from the documented canon.
- Product semantic examples retain semantic state colors outside the brand canon.
- Design-system tests, type-check, local validation, and browser checks pass.

## Risks and drift checks
- Risk: the UI becomes too flat. Mitigation: use Paper for the page, Mist for chrome, White for cards, Plane/Line for separation, and Ink/Steel/Ash for hierarchy.
- Risk: semantic state colors get folded into brand color. Mitigation: keep semantic variables separate from brand primitives.
- Risk: future CSS reintroduces slate colors. Mitigation: add a test that scans the route-scoped CSS.

## Implementation outline
- Refactor `reference.module.css` to canonical variables and remove old hardcoded shell colors.
- Update semantic examples to use explicit semantic variables.
- Add tests for palette drift and run local verification.
