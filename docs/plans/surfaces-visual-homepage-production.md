# Surfaces Visual Homepage Production

## Summary

Keep the root `surfaces.systems` landing page visual-first while making its
problem and payoff legible on the first phone screen. The hero now tells
design-system and platform teams that Surfaces helps them decide which
AI-generated interface should ship, then leads into one worked experiment
before offering a guided workflow review.

For the root homepage, this plan supersedes the multi-site dropdown direction
described in `judgmentkit-shared-header.md`. The shared Navigation component and
its behavior remain available to other applications and routes.

## Strategy alignment

The page makes the product decision boundary visible: generated interface
directions are explored, selected in context, checked against product authority,
and evaluated through outcome signals before the next design cycle.

Decision filter sentence:

> When an agent proposes a change to the user experience, Surfaces determines
> whether that change is allowed, under what conditions it may proceed, and
> blocks or corrects it if it violates intent.

The homepage communicates this direction without claiming a live production
runtime, public API, compliance certification, customer adoption, or a
self-serve designer product.

## Contract impact

### Contract definition

No source contract fields or semantics change. The homepage preserves the
existing `surfaces-web` markers:

- `landing.hero`
- `landing.demos`
- `landing.guidance`
- `landing.actions`

It also preserves the `page-container` marker and continues to use a shared
design-system component for the mobile menu icon.

### Enforcement timing

The change is checked at generation and CI/CD time through homepage tests,
type-checking, linting, build output, contract extraction, and repository style
validation. It adds no runtime edge-enforcement behavior.

### Violation handling

Promotion is blocked when required sections, copy boundaries, external-link
scope, responsive navigation behavior, contract extraction, or the production
build fails validation.

## Surface impact

- `surfaces.systems`: root homepage and root-page navigation are replaced.
- All auth, API, adaptive, demo, and design-system routes are preserved.
- Shared navigation in other applications is unchanged.

## Non-goals

- No product or company directory.
- No multi-site dropdown on the Surfaces homepage.
- No SurfaceOps, InterfaceCTL, or Surfaces Dev promotion on the homepage.
- No change to shared Navigation behavior outside the root homepage.
- No runtime-enforcement, production-adoption, public-API, SDK, certification,
  or customer-results claim.

## Acceptance criteria

1. The hero reads “AI can generate options. Surfaces helps your team decide what should ship.”
2. The worked experiment remains the primary explanatory artifact.
3. “See one decision end to end” is the primary hero action and links to the worked experiment.
4. The header link order is example, product direction, JudgmentKit, workflow
   review.
5. `https://judgmentkit.ai/` is the only HTTP(S) external anchor on the page,
   opens in the same tab, and has no dropdown treatment.
6. The three workflow-review calls to action use the same scoped `mailto:`.
7. Required contract sections occur once and in the required order.
8. Light and dark themes render without authored inline styles.
9. Desktop and mobile navigation, full-bleed hero integration, keyboard escape,
   focus restoration, and page overflow pass rendered QA.
10. App tests, lint, type-check, build, contract generation, extracted-contract
   validation, repository style validation, and Git diff checks pass.
11. The exact committed source is deployed to the Vercel `surfaces.systems`
    production project and both apex and `www` hosts are verified.

## Risks and mitigations

- Risk: route-level marketing styles leak into design-system or application
  routes.
  Mitigation: scope homepage selectors under `.surfaces-homepage`; limit the
  global menu lock to the mounted header lifecycle.
- Risk: transplanting the reviewed static source loses the canonical contract
  markers.
  Mitigation: render all four markers explicitly in `page.tsx` and test their
  uniqueness and order.
- Risk: the extra direct nav link collides just above the mobile breakpoint.
  Mitigation: verify both 821px and 820px with the production font and assets.
- Risk: the visual direction overstates current availability.
  Mitigation: retain “Illustrative model · no customer results” and distinguish
  the guided review from broader product direction.
- Risk: the hero drifts back toward category language that requires visitors to
  understand the product model before the problem.
  Mitigation: assert the plain-language headline, audience, primary proof
  action, and absence of the former abstract headline in app tests.

## Implementation outline

1. Start from the exact Git source currently serving production in a clean
   worktree.
2. Port the reviewed homepage source, assets, theme tokens, and metadata into
   `apps/surfaces-web`.
3. Use a root-page header with a direct JudgmentKit link and no company
   dropdown; leave the shared Navigation component untouched.
4. Update homepage tests and regenerate contract artifacts.
5. Run static, contract, responsive, light/dark, and production-build checks.
6. Commit and push the scoped branch, deploy that exact commit to production,
   and verify `surfaces.systems` and `www.surfaces.systems`.
