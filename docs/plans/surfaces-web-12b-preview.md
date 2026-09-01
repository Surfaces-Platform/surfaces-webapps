# Surfaces Web 12B Preview

## Summary
This change prepares the Surfaces homepage for a `preview.surfaces.systems` review before production promotion. It ports Concept 12B into `apps/surfaces-web` as a clearer landing page about AI-generated screens that look complete before the decision context is visible.

## Strategy alignment
The page strengthens the decision filter sentence by showing the moment when an AI-generated interface needs an explicit source, behavior expectation, owner, rationale, and next step before the work proceeds.

Decision filter sentence
“When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent.”

## Contract impact
1. Contract definition
No contract fields or semantics are added. The page preserves the existing `surfaces-web` required sections: `landing.hero`, `landing.demos`, `landing.guidance`, and `landing.actions`.

2. Enforcement timing
This affects `Generation time` as page-authored output and `CI/CD time` through the existing contract extraction, type-check, test, build, and validation flow. It does not add `Runtime (edge)` behavior.

3. Violation handling
Violations are blocked or signaled by existing static checks: missing required sections, extracted-contract drift, type errors, build failures, and visual review issues prevent preview readiness.

## Surface impact
- `surfaces.systems`: replaces the current architecture-first homepage with the 12B preview landing-page narrative.
- `surfaceops.ai`: no change.
- `interfacectl`: no change.

## Non-goals
- No production promotion.
- No new runtime middleware, production API, SDK, adapter, or self-serve workflow claim.
- No change to auth routes, design-system reference routes, or shared navigation behavior.
- No broad claim of compliance, certified accessibility, or customer validation.

## Acceptance criteria
1. The homepage renders the 12B hero, risk comparison, Source/Behavior/Owner questions, role read, and final access CTA.
2. The page keeps all required `data-contract-section` markers for `surfaces-web`.
3. The Simple Slab favicon replaces the older mark.
4. The preview image assets load from the app public directory.
5. `pnpm --filter surfaces-web type-check` passes.
6. `pnpm --filter surfaces-web test` passes.
7. `pnpm --filter surfaces-web build` passes.
8. Desktop and mobile screenshots show no broken layout, clipped text, or missing imagery.
9. `preview.surfaces.systems` resolves to the reviewed preview deployment before production promotion.

## Risks and drift checks
1. Risk: The page drifts back into implementation-heavy architecture copy.
   Mitigation: Keep the first read anchored in Source, Behavior, Owner, and review context.
2. Risk: 12B reads like an annotation tool instead of a governed surface.
   Mitigation: Include a compact proof layer for review context, handoff gate, and CI-style proof check without overclaiming runtime maturity.
3. Risk: Preview deployment accidentally includes unrelated local design-system-contract work.
   Mitigation: Implement from a clean worktree and review `git status` before deploying.

## Implementation outline
1. Create a clean branch worktree from `origin/main`.
2. Copy the two review images into `apps/surfaces-web/public/surfaces-preview/`.
3. Port Concept 12B into `apps/surfaces-web/app/page.tsx`.
4. Update metadata and the app icon to match the Simple Slab direction.
5. Update homepage tests.
6. Run local checks and visual review.
7. Deploy a Vercel preview and alias the reviewed deployment to `preview.surfaces.systems`.
