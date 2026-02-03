# Auth route runtime check (production)

**Date:** 2026-02-03  
**Domains checked:** surfaces.systems, surfaceops.ai, interfacectl.com, surfaces.dev (canonical hosts: www.* where bare domain redirects)

## Results table (after platform-auth contract fix 8b313e6)

| Domain | /auth/session | /auth/login | /auth/logout | /auth/callback |
|--------|----------------|-------------|--------------|----------------|
| **www.surfaces.systems** | 401, empty body | 500, `{"code":"AUTH_CONFIG_MISSING","message":"Missing auth configuration"}` | 500, `{"code":"AUTH_CONFIG_MISSING","message":"Missing auth configuration"}` | 500, `{"code":"AUTH_CONFIG_MISSING","message":"Missing auth configuration"}` |
| **www.surfaceops.ai** | 401, empty body | 500, `{"code":"AUTH_CONFIG_MISSING","message":"Missing auth configuration"}` | 500, `{"code":"AUTH_CONFIG_MISSING","message":"Missing auth configuration"}` | 500, `{"code":"AUTH_CONFIG_MISSING","message":"Missing auth configuration"}` |
| **www.interfacectl.com** | 401, empty body | 500, `{"code":"AUTH_CONFIG_MISSING","message":"Missing auth configuration"}` | 500, `{"code":"AUTH_CONFIG_MISSING","message":"Missing auth configuration"}` | 500, `{"code":"AUTH_CONFIG_MISSING","message":"Missing auth configuration"}` |
| **www.surfaces.dev** | 401, empty body | 500, `{"code":"AUTH_CONFIG_MISSING","message":"Missing auth configuration"}` | 500, `{"code":"AUTH_CONFIG_MISSING","message":"Missing auth configuration"}` | 500, `{"code":"AUTH_CONFIG_MISSING","message":"Missing auth configuration"}` |

*(Bare domains redirect 307/308 to www.)*

## Classification

- **Route presence:** All four routes exist on all four production apps; no 404s.
- **Session:** 401 with empty body when no session cookie — expected.
- **Missing config:** When required OIDC/env vars are not set:
  - **HTTP 500** with JSON body: `code: "AUTH_CONFIG_MISSING"`, `message: "Missing auth configuration"`.
  - Raw missing-var strings (e.g. "OIDC_ISSUER is required") are **not** returned to the client; they are logged server-side only.
- **Login, logout, callback:** All use the same error shape on config errors (JSON with AUTH_CONFIG_MISSING); logout no longer returns an empty 500 body.
- **No route-protection regression:** Auth routes do not 404 or force auth on unrelated paths.

**Conclusion:** Runtime contract verified. Missing-config behavior is consistent; remaining 500s are due to Production env vars not yet set in Vercel.

## Production env vars (Vercel)

Production env vars are **not** in the repo. Set them in **Vercel → Project → Environment Variables → Production** (and Preview if desired).

**Required (per app):** `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_REDIRECT_URI`, `SESSION_SECRET`, `PLATFORM_SURFACE_ID`  
**As needed:** `OIDC_CLIENT_SECRET`, `OIDC_POST_LOGOUT_REDIRECT_URI`, `OIDC_SCOPE`, `OIDC_AUDIENCE`, `SESSION_TTL_SECONDS`

**Suggested order:** Start with **surfaceops.ai**, then surfaces.systems, interfacectl.com, surfaces.dev. Per-app `PLATFORM_SURFACE_ID` and redirect URIs: see `docs/platform-auth/env.md`. After setting vars, trigger a Production redeploy.

**Post-env expectations:**
- `/auth/login` should return **302** to the OIDC authorize URL (no longer 500).
- `/auth/session` remains 401 until a real login flow is completed in the browser.
- `/auth/callback` without a real provider redirect will still fail (e.g. 400), but not with config detail leaked.

## Projects with Production env vars configured

- **As of this doc:** None set yet (all four show AUTH_CONFIG_MISSING).
- After you set them: note in PR or commit which projects have Production env vars (e.g. "surfaceops.ai Production env configured; others pending").
