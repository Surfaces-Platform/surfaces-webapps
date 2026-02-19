# SurfaceOps Neon + Vercel Rollout

This runbook covers the provider-side steps that are not stored in git.

## 1) Provision Neon integration in Vercel

1. In Vercel, open project `surfaceops-web`.
2. Install Neon from Marketplace.
3. Accept Neon Marketplace terms.
4. Link the Neon resource to `surfaceops-web`.
5. Enable environment injection for:
   - Development
   - Preview
   - Production

## 2) Environment contract

- `DATABASE_URL`: pooled runtime connection string.
- `DATABASE_URL_UNPOOLED`: direct connection string for migrations/admin scripts.

`surfaceops-web` runtime reads `DATABASE_URL`.
Scripts prefer `DATABASE_URL_UNPOOLED` and fall back to `DATABASE_URL`.

## 3) Preview branch strategy

In Neon integration settings:

1. Enable "branch per preview deployment".
2. Enable automatic cleanup on PR merge/close.
3. Confirm preview deployments receive branch-scoped DB env vars.

## 4) Staging validation

From `apps/surfaceops-web`:

```bash
DATABASE_URL_UNPOOLED=postgres://... pnpm migrate
DATABASE_URL_UNPOOLED=postgres://... pnpm backfill:governance:db -- --workspace-id ws-staging
DATABASE_URL_UNPOOLED=postgres://... pnpm verify:governance:db-parity -- --workspace-id ws-staging
DATABASE_URL_UNPOOLED=postgres://... pnpm sync:run-artifacts:db -- --workspace-id ws-staging
```

Set:

- `SURFACEOPS_RUNSTORE_MODE=db`
- `SURFACEOPS_GOVERNANCE_STORE_MODE=db`
- `SURFACEOPS_GOVERNANCE_DUAL_WRITE=1`

## 5) Production cutover

1. Apply migrations with `DATABASE_URL_UNPOOLED`.
2. Run backfill/parity for production workspace(s).
3. Set production store modes to `db`.
4. Keep dual-write on during stabilization window.

## 6) Monitoring and rollback

Monitor:

- RunStore/Governance fallback warnings.
- DB write failures.
- Parity drift output from verifier script.
- Deployment failures in Vercel.

Rollback path:

1. Set `SURFACEOPS_RUNSTORE_MODE=auto`.
2. Set `SURFACEOPS_GOVERNANCE_STORE_MODE=auto`.
3. Investigate DB errors, then restore `db` modes.
