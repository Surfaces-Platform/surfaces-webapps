# Feature Plan

## Summary
Correct the surfaces.systems homepage header and footer to use the approved Simple Slab horizontal lockup. The previous composition used a separate 32px mark and semibold text, which changed the approved wordmark weight and spacing.

## Strategy alignment
This is a correction to an existing brand invariant, not a product feature. An agent-produced interface must preserve the owner's approved identity instead of substituting a similar composition.

## Contract impact
1. Contract definition: preserve the three master polygons, the horizontal lockup's translate/scale, wordmark coordinates, 104px type, 780 weight, zero letter spacing, Ivory and Nickel fills. Trim only unused canvas space for header sizing.
2. Enforcement timing: at Generation time, use the local SurfacesBrand master as the source and the shared HomeBrand component as the rendered artifact. At CI/CD time, Vitest, TypeScript, ESLint, the production build, and existing interfacectl validation check the changed source. Runtime (edge) enforcement semantics are unchanged; live browser review checks the deployed rendering.
3. Violation handling: correct the existing mismatch and stop publication if focused validation or visual review finds clipping, geometry drift, or navigation regressions.

## Surface impact
surfaces.systems homepage header and footer, including the standalone HTML reference. Share one component so the rendered header and footer cannot diverge.

## Non-goals
No homepage copy, navigation, hero imagery, favicon, broader design-system download, or enforcement behavior changes.

## Acceptance criteria
1. Header and footer use the same horizontal lockup.
2. All three polygon coordinates and lockup placements match the master.
3. The wordmark uses the loaded Inter face at weight 780 with the approved spacing.
4. Ivory and Nickel remain the only lockup colors.
5. Desktop and mobile show an unclipped lockup and no horizontal overflow.
6. The home links retain their accessible names and the mobile menu retains its behavior.
7. Live production is verified against the published revision.

## Risks and drift checks
1. Font substitution: use the site's loaded Inter variable font directly in the SVG.
2. Accidental brand changes: retain the master coordinates and metrics; change only the outer canvas.
3. Scope expansion: keep the diff limited to the lockup component, its consumers, CSS, standalone reference, and affected tests.

## Implementation outline
Add the shared lockup, replace the two manual compositions, align the standalone reference, run focused checks, inspect desktop/mobile rendering, and publish the reviewed correction.
