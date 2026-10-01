# Feature Plan

## Summary

Add one audience eyebrow above the surfaces.systems homepage headline: `For teams turning UI review into reusable guidance`. The line answers who Surfaces is made for without changing the existing release-decision story or calls to action. It uses the existing eyebrow style with its text rendered in uppercase and Proof Cyan for a stronger brand signal.

This plan supersedes only the prior homepage criterion that required the audience eyebrow to be absent.

## Strategy alignment

The eyebrow names the work directly: turning UI review into guidance the team can reuse. The existing headline and supporting copy continue to explain the decision filter: clear repeat violations can be resolved from accepted guidance, while new or contested cases reach senior review.

## Contract impact

### 1. Contract definition

The `landing.hero` contract gains exactly one audience eyebrow immediately before the primary heading. Its text is `For teams turning UI review into reusable guidance`, and the hero eyebrow is visually transformed to uppercase with the existing `--sp-ui-proof` color token.

The hero headline, supporting copy, actions, visual, and section order remain unchanged.

### 2. Enforcement timing

`CI/CD time` applies. The focused homepage test checks the eyebrow's exact text and its placement directly before the `h1`.

No `Generation time` or `Runtime (edge)` behavior changes.

### 3. Violation handling

A missing, duplicated, renamed, or misplaced eyebrow is blocked by the homepage test before release.

## Surface impact

- `surfaces.systems`: clarifies the intended audience in the hero.
- `surfaceops.ai`: unchanged.
- `interfacectl`: unchanged.

## Non-goals

- No headline, supporting-copy, navigation, metadata, or call-to-action changes.
- No new visual tokens, components, assets, or responsive behavior beyond the uppercase Proof Cyan eyebrow treatment.
- No product-evidence or customer-outcome claims.
- No deployment or production promotion in this change.

## Acceptance criteria

1. The hero contains `For teams turning UI review into reusable guidance` above the headline.
2. The eyebrow appears exactly once.
3. The eyebrow is the direct sibling immediately before the hero `h1`.
4. The existing eyebrow style is reused and renders the text in uppercase with `--sp-ui-proof`.
5. The headline, supporting copy, calls to action, and section order remain unchanged.
6. The focused homepage test passes.
7. Desktop and mobile browser checks show no clipping, overlap, or horizontal overflow.

## Risks and drift checks

1. Risk: The audience line expands into unsupported positioning or customer proof. Mitigation: describe the team's review responsibility without adding an outcome claim.
2. Risk: The new line competes with the headline. Mitigation: limit Proof Cyan to the small eyebrow and verify both desktop and mobile layouts.
3. Risk: The change drifts into design tooling or orchestration language. Mitigation: name the teams without adding process, tool, or workflow claims.

## Implementation outline

1. Add the eyebrow to the static homepage source.
2. Replace the no-eyebrow assertion with exact copy and placement checks.
3. Run the focused homepage test, type check, and responsive browser verification.
