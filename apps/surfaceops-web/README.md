This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

# Backfill governance state into DB
DATABASE_URL_UNPOOLED=postgres://... pnpm backfill:governance:db -- --workspace-id ws-local-default

# Verify DB/FS parity for governance artifacts
DATABASE_URL_UNPOOLED=postgres://... pnpm verify:governance:db-parity -- --workspace-id ws-local-default

# Sync contract-runs artifacts into DB
DATABASE_URL_UNPOOLED=postgres://... pnpm sync:run-artifacts:db -- --workspace-id ws-local-default
```

Provider-side rollout steps (Vercel Marketplace + Neon preview branching):
`docs/neon-vercel-rollout.md`

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
