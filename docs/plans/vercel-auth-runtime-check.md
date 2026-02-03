# Auth route runtime check (production)

**Date:** 2026-02-03  
**Domains checked:** surfaces.systems, surfaceops.ai, interfacectl.com, surfaces.dev (canonical hosts: www.* where bare domain redirects)

## Results table (Step D — after setting Production secrets and redeploy)

| Domain | /auth/login status | Location host (if 302) | /auth/session status |
|--------|--------------------|------------------------|----------------------|
| **www.surfaceops.ai** | 500 | — | 401, empty |
| **www.surfaces.systems** | 500 | — | 401, empty |
| **www.interfacectl.com** | 500 | — | 401, empty |
| **www.surfaces.dev** | 500 | — | 401, empty |

**Body when 500:** `{"code":"AUTH_CONFIG_MISSING","message":"Missing auth configuration"}` (no raw env detail).

*(Bare domains redirect 307/308 to www. Login remains 500 until Production secrets are valid: if `scratch/secrets/*.txt` contained placeholders when Step B ran, replace them with real IdP and session values, re-run Step B and Step C, then re-check; expect 302 on login and 200 on session after browser login.)*

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

## Production secrets (Step A/B/C)

- **Step A:** `scratch/secrets/` was created and is gitignored. Four files: `OIDC_ISSUER.txt`, `OIDC_CLIENT_ID.txt`, `OIDC_CLIENT_SECRET.txt`, `SESSION_SECRET.txt`. Each contains only the value plus a trailing newline. Do not echo contents.
- **Step B:** For each Vercel project (surfaceops.ai, surfaces.systems, interfacectl.com, surfaces.dev), Production secrets were set via CLI: `vercel env add <name> production --sensitive --force < scratch/secrets/<name>.txt` for the four secrets. No secret values are stored in this doc or printed.
- **Step C:** Production redeploy was triggered for each of the four projects after setting env vars.

**Projects with Production env vars set:** All four have PLATFORM_SURFACE_ID, OIDC_REDIRECT_URI, OIDC_POST_LOGOUT_REDIRECT_URI, OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, SESSION_SECRET in Production. Values came from `scratch/secrets/*.txt`; no values are recorded here.

**If login still returns AUTH_CONFIG_MISSING after you set secrets and redeploy:** (1) Confirm vars are set for **Production** (not only Preview). (2) Ensure scratch/secrets/*.txt had real values at Step B. If they had placeholders, replace with real IdP and session values (do not echo), re-run Step B and Step C, then Step D; expect 302 on login and 200 on session after browser login.

### Per-app secrets (fix placeholder mistake)

Step B was run with placeholder secret files, so Production had invalid values. To fix:

- **Step 0 (done):** Required per-app files in `scratch/secrets/`: `OIDC_ISSUER.txt`, `SESSION_SECRET.txt`, and per-app `OIDC_CLIENT_ID__*.txt` / `OIDC_CLIENT_SECRET__*.txt` for SURFACEOPS, SURFACES_SYSTEMS, INTERFACECTL, SURFACES_DEV. The eight per-app client files were created empty and must be filled with one real value per file (no placeholders).
- **Blocked until filled:** Step 1 (overwrite Production secrets via stdin from these files), Step 2 (redeploy), Step 3 (curl verification), Step 4 (browser login on surfaceops.ai only). Do not run Step 1 until all 10 files exist and contain real values.

### Unblocking: Path A vs Path B

We are blocked on Step 0.1 because we do not have OIDC client ids and client secrets. Choose one approach:

**Path A (recommended):** Create 4 OIDC clients in your IdP, one per surface (surfaceops.ai, surfaces.systems, interfacectl.com, surfaces.dev). For each client, set redirect and logout URLs to match Vercel; paste each client’s id and secret into the correct `scratch/secrets/` file (one line per file). Then run Step 0.2 → 1 → 2 → 3.

**Path B (fastest for v1):** Create one OIDC client in your IdP and add all 4 redirect URIs and all 4 post-logout redirect URIs to that client. Put the same client id into all four `OIDC_CLIENT_ID__*.txt` files and the same client secret into all four `OIDC_CLIENT_SECRET__*.txt` files. Then run Step 0.2 → 1 → 2 → 3.

**IdP setup (do not paste secrets into chat):** For each surface domain, configure:

- **Redirect URI:** `https://www.<domain>/auth/callback`
- **Post logout redirect:** `https://www.<domain>/`

Domains: `www.surfaceops.ai`, `www.surfaces.systems`, `www.interfacectl.com`, `www.surfaces.dev`.

**Cleanup note:** Earlier placeholder secrets were pushed to Vercel. Once you have real secrets, Steps 1 and 2 overwrite them and redeploy; no separate cleanup step is needed.

### Step 0.2 validation script (corrected FILES list)

Use exactly 10 files (no duplicates). Run from repo root; output must be OK or FAIL only, never file contents.

```bash
FILES=(
  "scratch/secrets/OIDC_ISSUER.txt"
  "scratch/secrets/SESSION_SECRET.txt"
  "scratch/secrets/OIDC_CLIENT_ID__SURFACEOPS.txt"
  "scratch/secrets/OIDC_CLIENT_SECRET__SURFACEOPS.txt"
  "scratch/secrets/OIDC_CLIENT_ID__SURFACES_SYSTEMS.txt"
  "scratch/secrets/OIDC_CLIENT_SECRET__SURFACES_SYSTEMS.txt"
  "scratch/secrets/OIDC_CLIENT_ID__INTERFACECTL.txt"
  "scratch/secrets/OIDC_CLIENT_SECRET__INTERFACECTL.txt"
  "scratch/secrets/OIDC_CLIENT_ID__SURFACES_DEV.txt"
  "scratch/secrets/OIDC_CLIENT_SECRET__SURFACES_DEV.txt"
)
for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then echo "FAIL missing $f"; continue; fi
  if [ ! -s "$f" ]; then echo "FAIL empty $f"; continue; fi
  if [ "$(wc -l < "$f" | tr -d ' ')" -ne 1 ]; then echo "FAIL not_single_line $f"; continue; fi
  if grep -q "PLACEHOLDER" "$f"; then echo "FAIL placeholder $f"; continue; fi
  echo "OK $f"
done
```

Stop if any FAIL. If all 10 OK, run Step 1 (vercel env add from stdin), Step 2 (vercel --prod --yes per app), Step 3 (curl /auth/login and /auth/session per domain). Do not print or list env values.

---

## Callback: AUTH_TOKEN_EXCHANGE_FAILED / invalid_grant (403)

If `/auth/callback` returns 500 with `"code":"AUTH_TOKEN_EXCHANGE_FAILED"` and Auth0 responds with `invalid_grant` / "Invalid authorization code", the token request does not match what Auth0 expects.

### 1. Redirect URI must match exactly (most common)

Auth0 requires the `redirect_uri` in the **token** request to be **identical** to:

- The `redirect_uri` used in the **authorize** request (we use `OIDC_REDIRECT_URI` from env for both).
- One of the **Allowed Callback URLs** configured in the Auth0 Application.

We set Production `OIDC_REDIRECT_URI` to **www** URLs. In Auth0, for the single shared application, **Allowed Callback URLs** must include exactly (no trailing slash, https, with www):

- `https://www.surfaceops.ai/auth/callback`
- `https://www.surfaces.systems/auth/callback`
- `https://www.interfacectl.com/auth/callback`
- `https://www.surfaces.dev/auth/callback`

If Auth0 has bare domains (e.g. `https://surfaces.systems/auth/callback`) or a typo, you get `invalid_grant`. Fix: add or correct these four URLs in Auth0 → Application → Settings → Allowed Callback URLs.

### 2. Application type and client secret

- Application Type should be **Regular Web Application** (we send `client_secret` in the token request).
- If the app is "Native" or "SPA", Auth0 may reject the client_secret or require different behavior.

### 3. Code single-use and PKCE

- Each authorization code is single-use. If the callback is opened twice (e.g. refresh, back button, two tabs), the second request will get `invalid_grant`.
- PKCE verifier is stored in a cookie when we redirect to Auth0; the same browser must hit the callback so the cookie is sent. If the user bookmarked the callback URL or opened it in another device/browser, the verifier is missing → we return 400 AUTH_INVALID_STATE before calling Auth0; if you see 403 invalid_grant, the verifier was present and the code/redirect_uri/client combo is what Auth0 rejected.

---

## Login loop and invalid_grant — root cause (fixed 2026-02-03)

**Diagnosis:** The loop and invalid_grant were caused by **PLATFORM_SURFACE_ID containing a trailing newline** when set in Vercel (e.g. from `vercel env add` with a file that had a newline). The surface value was passed into platform-auth as `opts.surface` (from `process.env.PLATFORM_SURFACE_ID` in each app) and stored in the state JWT cookie **without trimming**. On callback, we compared `statePayload.surface` (e.g. `"surfaces.systems\n"`) with `opts.surface` (same or trimmed). If the app passed trimmed on callback but the cookie had been set with untrimmed on login, the comparison failed → **AUTH_INVALID_STATE** → we cleared PKCE/state cookies and returned 400. The user then hit `/auth/login` again (or Auth0 redirected to `/auth/login?iss=...`), we started a new authorize flow, and the cycle repeated (loop). Occasional **invalid_grant** could occur when the code was consumed once but the client retried or when redirect_uri/surface mismatch led to inconsistent state.

**Fix applied (minimal, in `@surfaces/platform-auth`):**

1. **Normalize surface (trim)** in `startLogin` and `handleCallback`: store and compare only trimmed values so env newlines cannot cause state mismatch. Callback now compares `statePayload.surface.trim()` with `opts.surface.trim()` so existing cookies with a newline still match after deploy.
2. **Already-logged-in check** in `startLogin`: if the user already has a valid session, redirect to `returnTo` instead of sending them to Auth0. This avoids unnecessary round-trips and reduces loop risk when re-entering `/auth/login?iss=...`.

**redirect_uri:** Confirmed consistent — authorize and token exchange both use `config.oidcRedirectUri` (from `OIDC_REDIRECT_URI`, trimmed in config). No dynamic substitution by surface.

**Auth0 configuration:** Application type "Regular Web Application", PKCE enabled, client secret sent; Allowed Callback URLs must include `https://www.surfaces.systems/auth/callback` (and the other three www URLs). No code change required for Auth0.

---

## AUTH_MISSING_WORKSPACE — claim key strategy (2026-02-03)

**Diagnosis:** platform-auth validated the ID token payload and required a non-empty `workspace_id` claim. Only the **raw** claim key `workspace_id` was supported (and optional `ClaimMapping` passed by callers; no env-based mapping existed). Auth0 does not add custom claims by default, so new signups produced tokens without `workspace_id` → 403 AUTH_MISSING_WORKSPACE.

**Fix:** (1) Accept workspace id from, in order: optional env `OIDC_WORKSPACE_CLAIM` key, **namespaced** `https://surfaces.systems/workspace_id`, or raw `workspace_id`. Same for `surface_access` with `https://surfaces.systems/surface_access` and raw `surface_access`. (2) Optional env vars `OIDC_WORKSPACE_CLAIM` and `OIDC_SURFACE_ACCESS_CLAIM` so a single custom key can be used if needed. (3) Auth0 Post Login Action adds the namespaced claims to the ID token (see `docs/platform-auth/auth0-post-login-action.md`). Default workspace id when missing in app_metadata: `ws_` + normalized user id. Default surface_access: all four surfaces.

**Redirect (surfaces.systems vs surfaceops):** Each app is a separate Vercel project with its own `OIDC_REDIRECT_URI` (e.g. surfaces-web has `https://www.surfaces.systems/auth/callback`). Login started on www.surfaces.systems runs in that deployment, so redirect_uri is correct and Auth0 redirects back to surfaces.systems. No cross-surface redirect unless `returnTo` points to another surface (validated by returnTo rules). No bug found; no change required.
