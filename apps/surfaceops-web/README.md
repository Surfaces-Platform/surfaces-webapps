`surfaceops-web` is the protected SurfaceOps application. It now hosts a project-centric contract workbench that:

- connects a GitHub repo and canonical contract path
- stores a mutable contract working copy in Postgres
- runs Codex-based baseline vs guided reruns through canonical `interfacectl` commands
- captures preview evidence and reviewed suggestions
- publishes the approved draft as a branch + PR

## Getting Started

### Auth (required for /contracts)

Configure auth env before accessing protected routes:

```bash
# From repo root
pnpm setup:auth
```

Then fill in `apps/surfaceops-web/.env.local` with values from Auth0 (OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, SESSION_SECRET). Add `http://localhost:3001/auth/callback` to Auth0 Allowed Callback URLs. See `docs/platform-auth/local-setup.md`.

### Database (Postgres / Neon)

`surfaceops-web` uses raw `pg` + SQL migrations.

- Runtime app reads `DATABASE_URL` (pooled connection string in Neon).
- Migration/admin scripts prefer `DATABASE_URL_UNPOOLED` and fall back to `DATABASE_URL`.

Common commands:

```bash
# Migrations (prefer direct/unpooled URL)
DATABASE_URL_UNPOOLED=postgres://... pnpm migrate

# Sync contract-runs artifacts into DB
DATABASE_URL_UNPOOLED=postgres://... pnpm sync:run-artifacts:db -- --workspace-id ws-local-default
```

Provider-side rollout steps (Vercel Marketplace + Neon preview branching):
`docs/neon-vercel-rollout.md`

### Contract workbench prerequisites

The protected `/contracts/governance` route is now project-backed. In addition to auth and Postgres, local development needs:

```bash
# Optional secret used to encrypt GitHub tokens and stored preview browser session state.
SURFACEOPS_SECRET_KEY=replace-me

# Optional blob/artifact root; defaults to repo-root/artifacts/surfaceops-blobs.
SURFACEOPS_BLOB_ROOT=/absolute/path/to/blob-root

# Optional temp clone root for managed rerun checkouts.
SURFACEOPS_REPO_CLONE_ROOT=/absolute/path/to/repo-cache

# Optional explicit interfacectl checkout when the resolver should prefer a specific local build.
SURFACES_INTERFACECTL_ROOT=/absolute/path/to/interfacectl
```

The managed rerun flow shells through resolver-backed `interfacectl` commands and the local `codex` CLI, so both must be available on the host. Preview URLs are project-configured per surface, and protected previews can reuse stored Playwright `storageState` JSON through the workbench.

### Database migrations

The contract workbench adds project, draft, rerun, auth-session, and publish tables in migration `005_contract_workbench_projects.sql`.

### First operating loop

The first real dogfood loop is local and operator-hosted. It targets `surfaceops-web` itself in `Surfaces-Platform/surfaces-webapps`.

1. Refresh the generated contract before connecting the project:

```bash
node /Users/mike/SurfacesPlatform/.worktrees/interfacectl-main/packages/interfacectl-cli/dist/index.js \
  init \
  --app-root apps/surfaceops-web \
  --surface surfaceops-web \
  --surface-kind application \
  --non-interactive \
  --analysis-out contracts/generated/surfaceops-web.analysis.json \
  --draft-out contracts/generated/surfaceops-web.design-system.draft.json \
  --contract-out contracts/generated/surfaceops-web.contract.json \
  --report-out contracts/generated/surfaceops-web.extraction.json
```

2. Apply migration `005_contract_workbench_projects.sql` and make sure these envs are set locally:
   `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `SURFACEOPS_SECRET_KEY`, `SURFACEOPS_BLOB_ROOT`, `SURFACEOPS_REPO_CLONE_ROOT`, and `SURFACES_INTERFACECTL_ROOT`.

3. Capture protected preview browser state once with Playwright:

```bash
pnpm --filter @surfaces/interfacectl-cli exec playwright codegen \
  --save-storage /tmp/surfaceops-preview-storage.json \
  https://surfaceopsai-git-main-surfaces-platform.vercel.app/contracts/governance
```

4. Start local `surfaceops-web`, then connect the project in `/contracts/governance` with:
   - repo: `Surfaces-Platform/surfaces-webapps`
   - contract path: `contracts/generated/surfaceops-web.contract.json`
   - surface config:

```json
[
  {
    "id": "surfaceops-web",
    "label": "SurfaceOps Web",
    "implementationBrief": "Implement the protected SurfaceOps contract workbench while preserving workspace auth, project selection, and the operator shell."
  }
]
```

   - preview targets:

```json
[
  {
    "surfaceId": "surfaceops-web",
    "url": "https://surfaceopsai-git-main-surfaces-platform.vercel.app/contracts/governance",
    "urlTemplate": "https://surfaceopsai-git-{branch}-surfaces-platform.vercel.app/contracts/governance",
    "waitFor": "Contract workbench",
    "authSessionKey": "surfaceops-governance-preview"
  }
]
```

5. Paste the storage JSON into the workbench auth-session panel, save it as `surfaceops-governance-preview`, run the first Codex rerun, review previews/findings/suggestions, accept at least one evidence-backed suggestion, rerun once more, and publish the resulting branch + PR.

### Run the dev server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the app by modifying files under `app/` and `lib/`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
