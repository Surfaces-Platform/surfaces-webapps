# Agent instructions

Read "docs/strategy.md" before planning or implementing any feature work.
Read "docs/taxonomy.md" and use its timing terms exactly.

For any feature work, produce a "Feature Plan" using "docs/feature-plan.template.md" and include it in the PR description or as a new file under "docs/plans/".

Do not proceed if you cannot clearly map the change to:
- contract definition or semantics
- enforcement timing (Generation time, CI/CD time, Runtime (edge), or a combination)
- violation handling

Before proposing code changes, ensure the plan explicitly states:
- which lifecycle context(s) the change affects
- which artifacts are used in each context
- which tools enforce decisions in each context

When work in this repo requires changes to `interfacectl`, follow this cross-repo workflow:
- make code changes in the sibling repo at `../interfacectl` (do not implement `interfacectl` code inside this repo)
- run relevant tests in `../interfacectl` for the changed behavior
- open/update the `interfacectl` PR first and capture its branch name and commit SHA
- in the `surfaces-webapps` PR, link the `interfacectl` PR and document dependency order/blocking status

When work spans repos or changes shared orchestration:
- start from `/Users/mike/SurfacesPlatform` and run `pnpm workspace:status`
- use the canonical clean worktrees defined in `../scripts/worktree/policy.json`
- use resolver-backed commands such as `scripts/interfacectl-tool.mjs`, `pnpm cli:where:*`, and `pnpm validate:*`
- prefer the sibling `../interfacectl` checkout or the canonical clean `.worktrees/interfacectl-main` baseline before falling back to `tools/interfacectl`
- do not add new hardcoded `tools/interfacectl/...` paths to scripts, docs, or CI
- treat `tools/interfacectl` as a vendored fallback mirror only; do not edit source files there directly
