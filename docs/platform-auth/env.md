# Platform Auth — Environment Variables

## Required (all apps)

| Variable | Description |
| -------- | ----------- |
| `OIDC_ISSUER` | OIDC provider issuer URL (e.g. `https://auth.example.com`). Discovery fetches `{OIDC_ISSUER}/.well-known/openid-configuration` for authorize, token, jwks, and optional logout endpoints. |
| `OIDC_CLIENT_ID` | OAuth2 client ID |
| `OIDC_REDIRECT_URI` | Per-app callback URL, must match `/auth/callback` |
| `OIDC_POST_LOGOUT_REDIRECT_URI` | Per-app post-logout URL (default: `/`) |
| `PLATFORM_SURFACE_ID` | Surface identifier (e.g. `surfaceops.ai`) |
| `SESSION_SECRET` | Secret for signing/encrypting session cookies. Must be unique per app. |

## Optional

| Variable | Description |
| -------- | ----------- |
| `OIDC_CLIENT_SECRET` | Client secret (if required by IdP) |
| `OIDC_SCOPE` | OAuth2 scope (default: `openid profile email`) |
| `OIDC_AUDIENCE` | Optional audience for token validation |
| `SESSION_TTL_SECONDS` | Session cookie TTL (default: 604800 = 7 days) |

## Per-app redirect URIs

| App | PLATFORM_SURFACE_ID | OIDC_REDIRECT_URI | OIDC_POST_LOGOUT_REDIRECT_URI |
| --- | ------------------- | ----------------- | ----------------------------- |
| surfaces-web | `surfaces.systems` | `https://surfaces.systems/auth/callback` | `https://surfaces.systems/` |
| surfaceops-web | `surfaceops.ai` | `https://surfaceops.ai/auth/callback` | `https://surfaceops.ai/` |
| interfacectl-web | `interfacectl.com` | `https://interfacectl.com/auth/callback` | `https://interfacectl.com/` |
| surfaces-dev | `docs.surfaces.dev` | `https://docs.surfaces.dev/auth/callback` | `https://docs.surfaces.dev/` |

For local development, use `http://localhost:{port}/auth/callback` for `OIDC_REDIRECT_URI` (e.g. `http://localhost:3001/auth/callback` for surfaceops-web).

## Cookie behavior

- **Always**: HttpOnly, SameSite=Lax, Path=/, no Domain attribute.
- **Production** (non-localhost host): Secure=true, cookie name `__Host-surfaces_session`.
- **Localhost development**: Secure=false, cookie name `surfaces_session` (omit `__Host-` prefix; `__Host-` requires Secure and is invalid on http://localhost).
