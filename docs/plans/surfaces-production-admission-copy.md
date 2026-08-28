# Feature Plan

## Summary

Reduce the production surfaces.systems homepage to one customer-facing story: release decisions should become reusable guidance, so a clear repeat violation does not consume the same senior review twice.

Keep the current visual system, slab asset, header behavior, responsive rules, and light/dark themes. Retain only the hero, recurring workload, and five-step guidance loop. Remove the illustrative model, boundary grid, public evidence scorecard, research funnel, audience eyebrow, every email CTA, and the hero mechanism card. Keep the slab image full-bleed. Delete the card-only overlay styles and reserved responsive spacing instead of replacing the card.

Customer value has not been demonstrated. The internal research gate remains separate from the public page.

## Strategy alignment

The homepage now separates management from execution:

- Surfaces directs what happens next and delegates the work.
- Agents execute in the tools the team already uses.
- Accepted guidance resolves clear repeat cases.
- New or contested cases reach the accountable owner.

Surfaces remains above the agent work loop. The page does not position it as the place where agents plan, generate, or implement the work, and it does not expose internal product-boundary or research-operating language to explain that distinction.

## Contract impact

### 1. Contract definition

The `surfaces-web` homepage requires three ordered sections:

- `landing.hero` — the intended customer outcome, one product CTA, and the full-bleed slab visual. Advance, Hold, and Reject remain supporting mechanism language in the guidance loop's `Decide` step.
- `landing.workload` — context hunting, re-explaining a settled decision, and chasing rework.
- `landing.guidance` — assemble context, decide, propose guidance, confirm changes, and reuse accepted guidance.

Shared section definitions used by other surfaces remain generic. The new `landing.workload` section is specific to the Surfaces homepage contract.

### 2. Enforcement timing

The HTML, TSX, metadata, CSS, source contract, and feature plan are `Generation time` artifacts for this communication change.

The change is checked at `CI/CD time` through focused Vitest coverage, contract generation, extracted-contract validation, local contract validation, lint, type-check, the production build, and rendered responsive/theme inspection.

The generated runtime manifest continues through the existing `Runtime (edge)` validation path. This homepage change does not add a runtime product mechanism.

### 3. Violation handling

Validation blocks a missing or reordered required section, a return of the deleted model/evidence/service structures, internal research language in public metadata, a mailto CTA, inaccurate guidance-loop sequencing, or drift in the protected visual assets and responsive behavior.

## Surface impact

- surfaces.systems: Simplified homepage content, metadata, navigation, contract markers, focused tests, mobile-menu padding, and generated contract/runtime artifacts.
- surfaceops.ai: No change.
- interfacectl: No change.

## Non-goals

- No redesign, new visual concept, replacement asset, new dependency, or new interaction.
- No public research scorecard, evidence quota, participant recruitment, or service-style contact funnel.
- No claim that Surfaces has reduced review time, drift, rework, or release delay.
- No claim that demand, customer value, or the guidance loop has been validated.
- No product implementation, schema, adapter, integration, or new enforcement mechanism.
- No rewrite of legacy routes, repository-wide strategy, or historical fixtures.
- No replacement for `kanban.cards` as the shared status layer.

## Acceptance criteria

- The hero says `Make every release decision reusable.` and `Resolve clear, repeated violations sooner, so senior judgment stays focused on what’s genuinely new or contested.`
- The hero mechanism card and its internal `Product hypothesis` label are absent; the slab image remains full-bleed.
- The audience eyebrow and all `mailto:` links are absent.
- The page contains only the hero, workload, and guidance contract sections, in that order.
- The workload contains only the observable burdens: `Context hunting`, `Re-explaining the decision`, and `Chasing rework`.
- The five-step loop remains `Assemble context`, `Decide`, `Propose guidance`, `Confirm changes`, and `Reuse`.
- The page states that Surfaces directs what happens next while agents execute in the tools the team already uses.
- The page retains one concise early-product-hypothesis line without exposing the internal evidence gate.
- The illustrative model, trust grid, evidence table, design-partner block, evidence counts, and service CTA copy are absent from rendered HTML and metadata.
- The slab asset, social image, icon, menu behavior, responsive behavior, and theme behavior remain intact.
- Focused and proportional validation pass, followed by rendered desktop/mobile light/dark QA.
- The production release promotes the exact verified commit and both `surfaces.systems` production aliases render the approved copy.

## Risks and drift checks

- Risk: Intended outcomes read as demonstrated results. Mitigation: retain explicit early-product-hypothesis language and ban unsupported reduction claims in tests.
- Risk: The management boundary reads as if Surfaces performs implementation. Mitigation: state the directing/executing split in one plain sentence.
- Risk: Internal strategy and evidence operations leak back into public copy. Mitigation: assert their absence in the focused homepage test.
- Risk: Removing sections becomes an accidental redesign. Mitigation: preserve the existing component styles and assets, then compare desktop, mobile, breakpoint, and theme renders.
- Risk: Removing the hero card leaves card-clearance space behind. Mitigation: delete only the card-specific overlay rules and responsive padding overrides, then verify the hero-to-workload transition at affected breakpoints.
- Risk: Production serves an unverified rebuild. Mitigation: capture the previous deployment, verify a READY preview for the exact Git SHA, and promote that same deployment.

## Implementation and release outline

- Reconcile the existing uncommitted homepage draft instead of discarding it.
- Remove the hero mechanism card, card-only styles, and card-reserved responsive spacing without replacing the element.
- Delete the obsolete public sections, links, extraction keys, and assertions.
- Align the source contract and regenerate derived contract/runtime artifacts through repository commands.
- Run focused tests, contract checks, lint, type-check, production build, and rendered QA.
- Inspect and commit only the intended homepage files.
- Push with the required GitHub account preflight.
- Verify the exact-SHA Vercel preview, promote that deployment to production, and verify both live aliases. Roll back to the captured prior deployment if production verification fails.
