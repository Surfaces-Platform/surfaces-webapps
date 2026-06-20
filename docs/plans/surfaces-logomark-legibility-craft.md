# Feature Plan

## Summary
Refine the public Surfaces compact mark so it remains legible at favicon and dense-navigation sizes while preserving the current wordmark-led design-system reference. This updates only the active identity assets, reference specimens, and resource package; it does not change product token behavior or Runtime (edge) enforcement.

## Strategy alignment
The design-system reference constrains how builders use Surfaces identity assets when producing public and product surfaces. Clear small-size identity assets reduce ambiguous redraws and keep generated interface artifacts aligned with the approved system.

Decision filter sentence
"When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent."

## Contract impact
1. Contract definition
The public identity contract is tightened around an approved optical mark set: primary mark, small mark, reverse mark, lockups, favicon, app icon, and brand kit resources. Product semantic tokens are unchanged.

2. Enforcement timing
Generation time guidance is updated through the design-system reference and asset downloads. CI/CD time enforcement remains covered by static asset tests, SVG parsing, leakage checks, and local validation.

3. Violation handling
Incorrect public identity output is signaled by failing tests or reference review; generated work should use the shipped assets instead of redrawing the mark.

## Surface impact
This affects surfaces.systems through the `/design-system` public reference and scoped downloadable assets.

## Non-goals
- No homepage narrative change.
- No product token rename or semantic color change.
- No Runtime (edge) behavior change.
- No deployment or standalone Vercel cutover.

## Acceptance criteria
- The compact mark reads clearly at 16 px, 24 px, and 32 px.
- Active SVG assets parse cleanly and contain no secondary tagline text.
- Brand kit contents match the active logo and token resources.
- `/design-system` and `/design-system/identity` show the updated optical mark set.
- Product-token tests and type-check continue to pass.
- Local browser review is possible before any push or deployment.

## Risks and drift checks
- Risk: identity work drifts into generic design-system marketing. Mitigation: keep the change limited to approved assets and reference specimens.
- Risk: small-size legibility is solved with documentation instead of artifact quality. Mitigation: ship a dedicated small mark for 16-24 px use.
- Risk: downloads diverge from the live reference. Mitigation: regenerate the brand kit from the same active assets.

## Implementation outline
- Replace the compact mark geometry with a one-color field mark and simplified small-size variant.
- Regenerate reverse, mono, grayscale, favicon, app icon, lockup, stacked, and social-card assets.
- Update reference copy and specimens where needed to explain the optical-size split.
- Rebuild the brand kit ZIP and run focused validation.
