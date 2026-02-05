# Platform Auth — Local Development Setup

For local development, each app needs auth env vars in `.env.local`. Use one of these approaches.

## Option A: From scratch/secrets (recommended if you have it)

If you have `scratch/secrets/` with shared files (all 4 apps use the same Auth0 application):

```bash
# From repo root — sets up all 4 apps
pnpm setup:auth

# Or a single app
pnpm setup:auth -- surfaceops-web
pnpm setup:auth -- surfaces-web
pnpm setup:auth -- interfacectl-web
pnpm setup:auth -- surfaces-dev

# Overwrite existing .env.local
pnpm setup:auth -- --force
```

Required files (shared across all apps):

- `scratch/secrets/OIDC_ISSUER.txt`
- `scratch/secrets/SESSION_SECRET.txt`
- `scratch/secrets/OIDC_CLIENT_ID.txt`
- `scratch/secrets/OIDC_CLIENT_SECRET.txt` (optional; Auth0 Regular Web App typically needs it)

Each file should contain a single line with the value (no trailing placeholder text).

## Option B: Manual .env.local

1. Copy the app’s `.env.example` to `.env.local`:

   ```bash
   cp apps/surfaceops-web/.env.example apps/surfaceops-web/.env.local
   ```

2. Fill in values from your Auth0 dashboard:
   - **OIDC_ISSUER** — Auth0 tenant URL, e.g. `https://your-tenant.auth0.com`
   - **OIDC_CLIENT_ID** — Application → Client ID
   - **OIDC_CLIENT_SECRET** — Application → Client Secret (required for Regular Web Application)
   - **SESSION_SECRET** — Any random string (e.g. `openssl rand -hex 32`)

3. In Auth0 → Application → Settings:
   - **Allowed Callback URLs:** add `http://localhost:3001/auth/callback` (for surfaceops-web)
   - **Allowed Logout URLs:** add `http://localhost:3001/`

## Per-app ports and redirect URIs

| App           | Port | OIDC_REDIRECT_URI                    |
|---------------|------|--------------------------------------|
| surfaceops-web| 3001 | `http://localhost:3001/auth/callback` |
| surfaces-web  | 3000 | `http://localhost:3000/auth/callback` |
| interfacectl-web | 3002 | `http://localhost:3002/auth/callback` |
| surfaces-dev  | 3003 | `http://localhost:3003/auth/callback` |

## Troubleshooting

- **AUTH_CONFIG_MISSING:** Required env vars are missing. Run `pnpm setup:auth` or fill `.env.local` manually.
- **invalid_grant:** Redirect URI mismatch. Ensure Auth0 Allowed Callback URLs includes the exact `OIDC_REDIRECT_URI` value.
- **AUTH_MISSING_WORKSPACE:** Auth0 Post Login Action must add `https://surfaces.systems/workspace_id` and `https://surfaces.systems/surface_access` to the ID token. See `auth0-post-login-action.md`.
