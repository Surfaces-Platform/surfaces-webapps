# Vercel preview build diagnosis

**Date:** 2025-01-31  
**Scope:** Reproduce preview builds locally via Vercel CLI; classify failures; propose config/env fixes only (no product code unless necessary).

---

## 1) Per-app status

| App | Domain | Vercel project name | `vercel build` result | Top error / note |
|-----|--------|----------------------|------------------------|------------------|
| surfaces-web | surfaces.systems | surfaces.systems | **PASS** (from repo root) / **FAIL** (from `apps/surfaces-web`) | When run from app dir: `ENOENT: .../apps/surfaces-web/apps/surfaces-web/package.json` |
| surfaceops-web | surfaceops.ai | surfaceops.ai | **PASS** (from repo root) | — |
| interfacectl-web | interfacectl.com | interfacectl.com | **PASS** (from repo root) | — |
| surfaces-dev | surfaces.dev | surfaces.dev | **PASS** (from repo root) | — |

**How builds were run:**  
`vercel pull --yes --environment=preview` was run from each `apps/<app>` directory. Then **`vercel build` was run from the monorepo root** with that app’s `.vercel` copied to root (so `rootDirectory` resolves as on Vercel). Running `vercel build` from inside `apps/surfaces-web` fails with the path-doubling error above; the other three were only tested from root.

**Detected framework / build settings (all four):**

- Framework: Next.js (nextjs)
- Lockfile: `pnpm-lock.yaml` version 9, pnpm@10.x, `package.json#packageManager` pnpm@10.26.2
- Build: `next build` (default)
- Install: (default, pnpm used)
- Root Directory: `apps/surfaces-web` | `apps/surfaceops-web` | `apps/interfacectl-web` | `apps/surfaces-dev`
- Node: 24.x

No missing-env or pnpm workspace errors during build. Auth env (`OIDC_*`, `SESSION_SECRET`, `PLATFORM_SURFACE_ID`) is read at **runtime** by `@surfaces/platform-auth`; missing Preview env would cause runtime 500 (e.g. AUTH_CONFIG_MISSING), not build failure.

---

## 2) Root cause classification

| App | Classification | Explanation |
|-----|----------------|-------------|
| surfaces-web | **config** (local only) | From `apps/surfaces-web`, CLI treats cwd as “root” and resolves `rootDirectory` under it → `apps/surfaces-web/apps/surfaces-web`. On Vercel (repo root), this does not occur. |
| surfaceops-web | — | No failure observed when building from repo root. |
| interfacectl-web | — | No failure observed when building from repo root. |
| surfaces-dev | — | No failure observed when building from repo root. |

**If previews still fail on Vercel**, the cause was not reproduced locally. Likely areas:

- **Git / repo link:** Each Vercel project must be linked to the **monorepo** repo (same root as this repo), not a subfolder or separate repo.
- **Root Directory:** Each project must have Root Directory = `apps/<app>` so the build runs from the app folder inside the cloned repo.
- **Runtime env:** Missing Preview env vars will break auth at **runtime** (500), not at build time.

---

## 3) Proposed fix list (highest leverage, lowest risk)

1. **Confirm Vercel project ↔ repo link**  
   For each of the four projects, ensure the connected Git repository is the monorepo (e.g. `Surfaces-Platform/surfaces-webapps` or whatever the real repo is) and that builds are triggered from the **root** of that repo. No code change.

2. **Confirm Root Directory per project**  
   In Vercel: Project Settings → General → Root Directory = `apps/surfaces-web` | `apps/surfaceops-web` | `apps/interfacectl-web` | `apps/surfaces-dev` respectively. Already set in pulled `project.json`; verify in dashboard. No code change.

3. **Preview environment variables (runtime)**  
   If previews deploy but auth returns 500, add Preview env vars in Vercel (Project Settings → Environment Variables → Preview):  
   `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` (if required), `OIDC_REDIRECT_URI`, `OIDC_POST_LOGOUT_REDIRECT_URI` (optional), `SESSION_SECRET`, `PLATFORM_SURFACE_ID`. No code change.

4. **Local repro: run build from repo root**  
   To match Vercel behavior locally, run from monorepo root with the target app’s project linked at root, e.g.:  
   - Copy `apps/<app>/.vercel` to repo root as `.vercel`, then from root run `vercel build`.  
   Or use a script that does this per app. No product code change.

5. **Optional: Install command**  
   If Vercel ever picks the wrong package manager, set Install Command to `pnpm install` for the Preview (and Production) environment. Currently not required; pnpm was auto-detected.

---

## 4) Exact Vercel setting recommendations

- **Root Directory:**  
  - surfaces.systems → `apps/surfaces-web`  
  - surfaceops.ai → `apps/surfaceops-web`  
  - interfacectl.com → `apps/interfacectl-web`  
  - surfaces.dev → `apps/surfaces-dev`

- **Build Command:** leave default (`pnpm run build` / `next build`).

- **Install Command:** leave default (pnpm auto-detected from lockfile and `packageManager`).

- **Node.js Version:** 24.x (already set in pulled settings).

- **Environment variables (Preview):**  
  Set for each app in Preview if you need working auth on preview URLs:  
  `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_REDIRECT_URI`, `SESSION_SECRET`, `PLATFORM_SURFACE_ID`; plus `OIDC_CLIENT_SECRET` and optionally `OIDC_POST_LOGOUT_REDIRECT_URI` per `docs/platform-auth/env.md`.

---

## 5) Stop condition: code changes

No application or package code changes were required for the above. If a specific Vercel preview failure points to a build-time error (e.g. missing build-time env or a path issue in code), the minimal diff and rationale should be proposed separately before applying.

---

## 6) Note on root `.vercel` after testing

After running the four builds from the repo root, the root `.vercel` directory was left pointing at **surfaces.dev** (last app built). If you normally use a different project at root (e.g. surfaces-monorepo), run `vercel link` from the repo root and choose the desired project again.
