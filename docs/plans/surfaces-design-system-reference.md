# Feature Plan

## Summary
Move the Surfaces design system reference into `surfaces.systems` as a first-party `/design-system` route. The route gives builders public-safe identity, token, pattern, resource, governance, and changelog guidance without replacing the existing contract-enforcement homepage.

## Strategy alignment
This strengthens the decision filter by making the public interface contract reference easier to find and validate in the same first-party surface that explains Surfaces. The reference documents the interface assets, semantic product states, and release-record patterns that downstream generated UI must preserve before changes reach users.

Decision filter sentence
"When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent."

## Contract impact
1. Contract definition
No executable contract schema changes. The route documents current identity, token, product-state, component, and pattern semantics that generated or reviewed interfaces should preserve.

2. Enforcement timing
Generation time and CI/CD time. Generation time guidance tells builders what output is allowed; CI/CD time checks verify the route builds, type-checks, has public resources, and stays free of process leakage. Runtime (edge) is unchanged.

3. Violation handling
Invalid implementation changes are blocked by type-check, tests, build, route checks, and leakage scans before deployment. No runtime blocking behavior is added.

## Surface impact
- surfaces.systems: Adds `/design-system` and child routes as the public reference.
- surfaceops.ai: No direct change.
- interfacectl: No direct change.

## Non-goals
- Do not redesign the logo, token schema, or current homepage.
- Do not move standalone preview/archive/process artifacts.
- Do not add the standalone `create-a-premium-logo-and-brand` project to the permanent Vercel project map.
- Do not change Runtime (edge) guards or adaptive routes.

## Acceptance criteria
- `/design-system` and all child routes render in `surfaces-web`.
- Public-safe logo assets, token downloads, social card, favicon/app icon, and brand kit are served under `/design-system/...`.
- The existing homepage keeps its current narrative and includes a route to `/design-system`.
- Type-check, tests, and build pass for `surfaces-web`.
- Leakage scans find no prompt, tool, process, internal-review, treatment, competitor, deployment, or local-QA terms in rendered reference UI.
- Desktop and 390px mobile browser checks show no horizontal overflow or broken images.
- Mobile `/design-system` first viewport remains roughly 920px tall or less.
- `pnpm run validate:local` is attempted and any existing unrelated contract issues are documented.

## Risks and drift checks
- Drift into design-system marketing instead of contract reference. Mitigation: keep copy focused on allowed identity, token, state, and pattern semantics.
- Drift into process/tool leakage. Mitigation: run source and rendered leakage scans before handoff.
- Drift into a second homepage. Mitigation: keep this as `/design-system` and preserve the existing home page.

## Implementation outline
- Create the `surfaces-webapps` feature worktree.
- Copy public-safe assets into `apps/surfaces-web/public/design-system`.
- Add typed reference content and reusable route components under `apps/surfaces-web/app/design-system`.
- Add tests for route content, resources, and leakage guardrails.
- Run local validation and browser QA without deploying.
