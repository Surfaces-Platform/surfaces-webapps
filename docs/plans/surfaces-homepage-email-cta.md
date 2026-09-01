# Feature Plan

## Summary

Add one email CTA to the production surfaces.systems homepage so a visitor can share a recent interface release decision with Mike. Pair it with `See how it works` in the hero using the current secondary-button and responsive full-width treatments, and add a `JudgmentKit MCP` link immediately after `How it works` in the header.

This plan supersedes only the mailto prohibition in `surfaces-production-admission-copy.md`. The earlier plan remains authoritative for the homepage narrative, visual system, hypothesis boundary, and absence of a service-style funnel.

## Strategy alignment

The CTA creates a direct path for testing the Surfaces decision filter against concrete release decisions: what change was proposed, what prior guidance existed, and whether the case was a clear repeat or genuinely new or contested. It does not claim that the product direction or customer value has been validated.

## Contract impact

### 1. Contract definition

No shared contract fields or semantics change. Within the existing `landing.hero` section, the homepage gains exactly one secondary email action after `See how it works`. The email action must keep its exact recipient, subject, editable body prompts, visible label, accessible name, and placement. The header gains exactly one same-tab `JudgmentKit MCP` link after `How it works`, using the established public JudgmentKit root.

### 2. Enforcement timing

The standalone homepage HTML, rendered React header source, existing CSS responsive contract, focused homepage and header tests, and this plan are `Generation time` artifacts. The change is checked at `CI/CD time` through focused Vitest coverage, lint, type-check, the production build, source-diff checks, and rendered desktop and 390-pixel browser verification. No `Runtime (edge)` mechanism changes.

### 3. Violation handling

Focused tests block a missing, duplicated, misplaced, or incorrectly encoded email action; a changed primary hero CTA; an incorrect recipient, subject, body, label, or accessible name; an incorrect or misordered JudgmentKit link; and loss of the existing 390-pixel full-width button rule. Browser verification signals visual overflow, clipping, placement, navigation-menu, or responsive-width regressions before release.

## Surface impact

- surfaces.systems: one secondary email CTA in the hero and one external header link.
- surfaceops.ai: no change.
- interfacectl: no change.

## Non-goals

- No form, API endpoint, submission storage, analytics, or email-sending backend.
- No footer, metadata, asset, or product-narrative rewrite beyond the authorized hero action placement and header link.
- No new dependency or bespoke responsive component.
- No claim that demand, customer value, or the product hypothesis has been validated.
- No push, pull request, production deployment, release, promotion, or production modification. A Vercel preview is allowed for review.

## Acceptance criteria

- The visible label is `Share a recent release decision`, and the accessible name is `Share a recent release decision by email with Mike`, preserving the visible label for voice-control matching while making the email action explicit.
- The only mailto link addresses `mike@surfaces.systems`, with the subject `A recent interface release decision` and safely percent-encoded subject and body values.
- The decoded editable body exactly matches the approved greeting and three concise checkbox choices, with no trailing context prompt.
- The CTA is the second action in the hero, immediately after `See how it works`, with no lower duplicate.
- The primary hero CTA remains `See how it works` and still targets `#product-direction`.
- Desktop places both hero actions side by side when space permits; at 390 pixels they stack at full width.
- The header link label is `JudgmentKit MCP`, its target is `https://judgmentkit.ai/`, and it follows `How it works` in both rendered and standalone headers.
- The JudgmentKit link uses the existing same-tab header-link treatment and closes the mobile menu when selected.
- Focused tests, lint, type-check, build, diff checks, and responsive browser verification pass.

## Risks and drift checks

- Risk: The contact path turns into a service funnel. Mitigation: keep one secondary mailto action, retain the explicit hypothesis boundary, and add no form, scheduling, or sales copy.
- Risk: Prefill text becomes corrupted or non-editable. Mitigation: encode the subject and body independently and assert their exact decoded values.
- Risk: The new action competes with the primary hero CTA or the external nav destination displaces the product story. Mitigation: keep `See how it works` first and primary, style the email action as secondary, and render JudgmentKit as a standard final nav link.

## Implementation outline

1. Move the safely encoded mailto link into the existing hero action row and remove the lower duplicate.
2. Add the same-tab JudgmentKit link to the rendered and standalone headers.
3. Reuse existing hero, button, navigation, and responsive styles without adding a dependency.
4. Update focused homepage and header coverage for semantics, encoding, order, placement, and mobile-menu behavior.
5. Run proportional local and responsive browser validation, then publish only a Vercel preview.
