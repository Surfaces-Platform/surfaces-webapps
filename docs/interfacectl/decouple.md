# Interfacectl Decoupling Plan

## Why we decoupled

- Publish the `@surfaces/interfacectl-cli` and `@surfaces/interfacectl-validator` packages as reusable tooling.
- Allow the CLI to run in any external repository without workspace assumptions.
- Make schema validation deterministic and self-contained (schema now ships with the validator).

## New repository

- Local scaffold: `/tmp/interfacectl-repo` (mirror this to the canonical Git remote, e.g. `surfaces/interfacectl`)
- Structure:
  - `packages/interfacectl-validator`
  - `packages/interfacectl-cli`
  - Changesets configured for independent versioning
  - CI workflow (`.github/workflows/ci.yml`) runs `pnpm build` and `pnpm test` on Node 18/20
  - Release workflow (`.github/workflows/release.yml`) installs, tests, and (when `NPM_TOKEN` exists) runs `pnpm changeset publish`

> Action: mirror `/tmp/interfacectl-repo` to the canonical Git host and wire the Release workflow secrets.

## How releases work

1. In the standalone repo run `pnpm changeset` to record changes.
2. Commit and merge the generated changeset.
3. Trigger the **Release** workflow (or push a `v*` tag).
4. Ensure `NPM_TOKEN` is configured in repository secrets; otherwise the workflow logs a skip message.

Validator builds copy the bundled schema automatically via `packages/interfacectl-validator/scripts/copy-schema.mjs`.

## Using the CLI from the Surfaces monorepo

- Install the published CLI when you need to validate: `pnpm add -D @surfaces/interfacectl-cli`
- (Optional) For one-off runs you can use a tarball or `pnpm dlx` pointing at the standalone repo.
- After installation run `pnpm exec interfacectl validate --root . --contract contracts/surfaces.web.contract.json`
- Remember to keep `interfacectl.config.json` in sync with surface locations (see below).

## Local validation workflow

- Descriptor roots are defined in `interfacectl.config.json`:

```json
{
  "surfaceRoots": {
    "interfacectl-web": "apps/interfacectl-web",
    "surfaceops-web": "apps/surfaceops-web",
    "surfaces-web": "apps/surfaces-web"
  }
}
```

Override with `--config <path>` or `SURFACES_CONFIG`.

- Direct CLI usage: `pnpm exec interfacectl validate --root . --contract contracts/surfaces.web.contract.json`
- JSON output: append `--format json`
- Write to a file: add `--out tmp/report.json`
- Environment fallbacks:
  - `SURFACES_ROOT` overrides `--root`
  - `SURFACES_CONTRACT` overrides `--contract`

## When the schema changes

1. Update the source schema in the standalone repo (`packages/interfacectl-validator/src/schema/web.surface.contract.schema.json`).
2. Re-run `pnpm -r run build` to copy the schema into `dist/schema/`.
3. Bump versions via changesets and publish new packages.
4. Consume the new version in the Surfaces monorepo (`pnpm add -D @surfaces/interfacectl-cli@<new version>`).

## Definition of Done checklist

- [ ] CLI and validator build without workspace assumptions (in the standalone repo).
- [ ] Bundled schema copied into validator dist output.
- [ ] Fixture portability test passes (`pnpm --filter @surfaces/interfacectl-cli run test` in the standalone repo).
- [ ] `pnpm exec interfacectl validate --root . --contract contracts/surfaces.web.contract.json` succeeds when the CLI is installed locally.
- [ ] New repository scaffold synced with CI, release workflow, and README.
- [ ] Changeset recorded for any release-bound modifications.

