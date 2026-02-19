# Feature Plan

## Summary
This plan adds canonical Vercel project guardrails to prevent accidental linking to non-canonical projects during operational workflows. It introduces a tracked project map, a strict preflight checker for local `.vercel/project.json` files, an allowlist for team-level external projects, and safe wrapper commands for `link`, `env pull`, integration operations, and team-scope auditing. The wrappers force app-scoped targeting and fail fast on mismatches.

## Strategy alignment
This strengthens the decision filter by enforcing deterministic environment/project targeting before release and operational changes can proceed. It prevents drift where deployment infrastructure can silently route contract and governance workflows to the wrong tenant/project context.

Decision filter sentence
"When an agent proposes a change to the user experience, Surfaces determines whether that change is allowed, under what conditions it may proceed, and blocks or corrects it if it violates intent."

## Contract impact
1. Contract definition
No public runtime contract fields are changed. This adds an operational contract for canonical app-to-project mapping and approved external team projects in `scripts/vercel/project-map.json`.

2. Enforcement timing
`CI/CD time` and operator workflow enforcement. The preflight checker blocks non-canonical link state before deployment/integration operations.

3. Violation handling
Blocked and signaled. Commands fail closed with explicit mismatch diagnostics and remediation commands.

## Surface impact
- surfaces.systems: protected from mis-targeted env/integration operations.
- surfaceops.ai: protected from accidental project drift during Neon and DB rollout workflows.
- interfacectl: protected from zombie project creation and wrong-link operations.

## Non-goals
- No changes to runtime (edge) request handling.
- No migration of existing Vercel projects/domains.
- No change to DB schema or persistence behavior.

## Acceptance criteria
1. A tracked canonical map exists for managed apps with project IDs and names.
2. Preflight command fails when `.vercel/project.json` does not match canonical mapping.
3. `link` wrapper verifies remote project identity and relinks deterministically.
4. `env-pull` wrapper fails if the local app is linked to a non-canonical project.
5. `integration-list` and `integration-add` wrappers operate only against canonical app targets.
6. `audit` fails on unknown team projects and managed project ID drift.
7. New tests cover preflight pass/fail, wrapper command routing, and audit behavior.
8. Repo README documents safe wrapper and audit usage.

## Risks and drift checks
1. Risk: operational bypass by direct raw `vercel` commands.
Mitigation: provide short wrapper commands in `package.json` and document canonical usage.
2. Risk: map drift (project ID changes not reflected in repo).
Mitigation: preflight is strict on both `projectId` and `projectName`; team-scope audit checks managed project IDs against Vercel.
3. Risk: wrappers still run against wrong scope.
Mitigation: scope slug is pinned in the canonical map and used for every wrapper call.

## Implementation outline
1. Add canonical map in `scripts/vercel/project-map.json`.
2. Implement `scripts/vercel/safe-cli.mjs` with `check`, `audit`, `link`, `env-pull`, `integration-list`, and `integration-add`.
3. Wire root npm scripts for wrapper access.
4. Add tests for preflight and wrapper command routing.
5. Document usage in README.
