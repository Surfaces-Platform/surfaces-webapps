# Surfaces Platform Web Monorepo

This monorepo contains five Next.js web applications and one desktop alpha shell for the Surfaces Platform:

- **surfaces-web** - Company website and dogfood surface (surfaces.systems) — auth-aware, public by default
- **surfaceops-web** - SurfaceOps public marketing/download site plus the local workbench source (surfaceops.ai)
- **interfacectl-web** - Executable interface control (interfacectl.com) — auth-aware, public by default
- **surfaces-dev** - Developer documentation and reference (surfaces.dev) — auth-aware, public by default
- **reference-target-web** - Neutral deterministic reference target for governance inspector demos
- **surfaceops-desktop** - Electron-based desktop alpha shell for the local SurfaceOps workbench

## Local Development

**First-time clone:** Day-to-day validation and generation require either a sibling standalone `../interfacectl` checkout or an explicit `SURFACES_INTERFACECTL_ROOT`.

### Running Individual Apps

Each app runs on its own port to allow concurrent development:

```bash
# Run surfaces-web on port 3000
pnpm dev:surfaces
# or
cd apps/surfaces-web && pnpm dev

# Run surfaceops-web on port 3001
pnpm dev:surfaceops
# or
cd apps/surfaceops-web && pnpm dev

# Run the SurfaceOps desktop alpha shell
pnpm dev:surfaceops:desktop
# or
cd apps/surfaceops-desktop && pnpm dev

# Build a local macOS desktop artifact
pnpm --filter surfaceops-desktop dist:mac

# Run interfacectl-web on port 3002
pnpm dev:interfacectl
# or
cd apps/interfacectl-web && pnpm dev

# Run surfaces-dev on port 3003
pnpm dev:surfaces-dev
# or
cd apps/surfaces-dev && pnpm dev

# Run reference-target-web on port 3004
pnpm dev:reference-target
# or
cd apps/reference-target-web && pnpm dev
```

### Running All Apps

To run all apps concurrently:

```bash
pnpm dev:all
```

Or manually in separate terminals:

```bash
# Terminal 1
pnpm dev:surfaces    # http://localhost:3000

# Terminal 2
pnpm dev:surfaceops  # http://localhost:3001

# Terminal 3
pnpm dev:interfacectl # http://localhost:3002

# Terminal 4
pnpm dev:surfaces-dev # http://localhost:3003

# Terminal 5
pnpm dev:reference-target # http://localhost:3004
```

### Local Development URLs

- Surfaces: http://localhost:3000
- SurfaceOps: http://localhost:3001
- SurfaceOps desktop alpha: launches a local Electron shell over the workbench
- InterfaceCTL: http://localhost:3002
- Surfaces.dev: http://localhost:3003
- Reference target: http://localhost:3004

## Auth posture

All apps expose the same `/auth` routes (login, callback, session, logout) to support SSO across domains where needed. surfaces.systems, surfaces.dev, and interfacectl.com are public by default in v1 but are auth-aware. surfaceops.ai is now marketing/download-first in production, while the contract workbench remains local-only and is being wrapped by the desktop alpha shell.

## SurfaceOps desktop releases

The `surfaceops.ai` web app is now the canonical updater surface for the desktop client:

- website download page: `/download`
- website release notes: `/release-notes`
- updater feed base: `/api/desktop/updates/<channel>/darwin-arm64`

The Electron app itself is now a single-page shell rooted at `/contracts/governance`. In desktop runtime it hides the shared `surfaceops.ai` navigation and keeps updater controls in the native menu instead of a separate React settings route.

The GitHub workflow `.github/workflows/surfaceops-desktop-release.yml` now publishes public alpha releases automatically from clean semver tags (`vX.Y.Z`). It builds the desktop app once, emits DMG/ZIP assets plus release manifest payloads, publishes versioned assets to GitHub Releases, and updates the canonical `surfaceops-desktop-feed` release whose manifest is what `surfaceops.ai` reads by default in production.

Stable does not rebuild. The scheduled workflow `.github/workflows/surfaceops-desktop-stable-promotion.yml` promotes the exact same signed alpha payload to the stable feed after a 72 hour soak, and `.github/workflows/surfaceops-desktop-promotion-control.yml` lets operators block, unblock, or force-promote releases by updating the feed-side `surfaceops-desktop-promotion-state.json` asset.

Before the first public alpha tag, the dress rehearsal path runs through `.github/workflows/surfaceops-desktop-release-rehearsal.yml`, `.github/workflows/surfaceops-desktop-stable-promotion-rehearsal.yml`, and `.github/workflows/surfaceops-desktop-promotion-control-rehearsal.yml`. Those workflows publish only to the isolated `surfaceops-desktop-feed-rehearsal` release and support local/preview validation through the stable rehearsal manifest URL documented in `docs/plans/surfaceops-desktop-alpha-launch-rehearsal.md`.

That runbook now centers Stage A on a disposable Apple Silicon macOS VM driven by `Tart` on this Mac first. The VM gate is a signed install/update smoke pass, not a guest-local inference certification pass; optional physical-Mac or true local-inference signoff can remain a separate later gate.

## Production Domains

When deployed, each app runs on its own domain:

- Surfaces: https://surfaces.systems
- SurfaceOps: https://surfaceops.ai
- InterfaceCTL: https://interfacectl.com
- Surfaces.dev: https://surfaces.dev
- Reference target: configured via `NEXT_PUBLIC_GOVERNANCE_REFERENCE_TARGET_URL`

The Navigation component automatically detects the environment and routes to the correct domains in production, or localhost ports in development.

## Safe Vercel Project Linking

To prevent accidental project creation or linking against the wrong Vercel project, use the guarded wrappers at repo root:

```bash
# Verify local .vercel/project.json files match canonical mappings
pnpm vercel:project:check

# Audit the full Vercel team scope against canonical + external allowlist
pnpm vercel:project:audit

# Relink one app to its canonical Vercel project
pnpm vercel:project:link -- --app surfaceops-web

# Pull env vars from the app's canonical Vercel project
pnpm vercel:env:pull -- --app surfaceops-web --environment preview

# Install/list integrations against the app's canonical project
pnpm vercel:integration:add -- --app surfaceops-web --name neon
pnpm vercel:integration:list -- --app surfaceops-web --integration neon
```

Canonical mappings live in `scripts/vercel/project-map.json` and are enforced by `scripts/vercel/safe-cli.mjs`.
Projects in the same Vercel team but outside this repo can be approved under `allowedExternalProjects` in that map.

## Environment Variables (Optional)

You can customize the development URLs by setting environment variables in each app:

- `NEXT_PUBLIC_SURFACES_URL` - Default: `http://localhost:3000`
- `NEXT_PUBLIC_SURFACEOPS_URL` - Default: `http://localhost:3001`
- `NEXT_PUBLIC_INTERFACECTL_URL` - Default: `http://localhost:3002`
- `NEXT_PUBLIC_SURFACES_DEV_URL` - Default: `http://localhost:3003`
- `NEXT_PUBLIC_GOVERNANCE_REFERENCE_TARGET_URL` - Default (dev): `http://localhost:3004`

These can be set in `.env.local` files in each app directory.

## Type Checking

Run TypeScript type checking (same strictness as Vercel builds):

```bash
# Type-check all packages
pnpm type-check

# Type-check individual packages
pnpm type-check:ui           # UI package only
pnpm type-check:surfaces     # surfaces-web only
pnpm type-check:surfaceops   # surfaceops-web only
pnpm type-check:interfacectl # interfacectl-web only
pnpm type-check:surfaces-dev # surfaces-dev only
```

This runs `tsc --noEmit` for each package, catching type errors before pushing to Vercel.

## Contract Validation

Validate interface contract compliance:

```bash
# Local development: uses the resolver-backed CLI entrypoint
pnpm validate:local

# CI/production: prints provenance, builds local sources when needed, then validates
pnpm validate:ci
```

**Validation strategy:**
- `scripts/interfacectl-tool.mjs` resolves the CLI in this order: `SURFACES_INTERFACECTL_CLI` or `SURFACES_INTERFACECTL_GENERATION_GUARD`, then `SURFACES_INTERFACECTL_ROOT`, then a detected sibling standalone checkout (`../interfacectl` or the matching clean worktree), then an installed `@surfaces/interfacectl-cli`.
- `pnpm run interfacectl:build` only builds when the resolved source is a standalone checkout.
- `validate:local` and `validate:ci` use the same resolver-backed entrypoint as the rest of the repo.

Check CLI provenance:
```bash
# Local dev provenance
pnpm cli:where:local

# CI/prod provenance (after build)
pnpm cli:where:ci
```

This runs `interfacectl validate` against the contract defined in `contracts/surfaces.web.contract.json`.
For icon-source violation lifecycle and visibility details across `Generation time`, `CI/CD time`, and `Runtime (edge)`, see the canonical [`interfacectl` contract-validation reference](https://github.com/Surfaces-Platform/interfacectl/blob/main/docs/contract-validation.md).

### Phase 0 contract generation

Generated contract artifacts are produced by the interfacectl CLI and committed so CI can detect drift.

**How to run generation (from repo root):**

1. Ensure `interfacectl` is resolvable and built:
   ```bash
   pnpm install
   pnpm run interfacectl:build
   ```
2. Generate the contract:
   ```bash
   pnpm run generate:contract
   ```

**What files change:** Outputs are written to `contracts/generated/`:

- `surfaces-web.contract.json` — schema-valid contract with extracted routes, shell, design-system components, auth.
- `surfaces-web.extraction.json` — extraction report and warnings.

**If CI fails on drift:** The job "Check generated contract drift" fails when committed artifacts in `contracts/generated/` differ from a fresh run. Fix it by running the same steps locally and committing the updated files:

```bash
pnpm run interfacectl:build && pnpm run generate:contract
git add contracts/generated/
git commit -m "chore: update generated contract artifacts"
```

### Pre-commit Hooks

Interface contract validation runs automatically before each commit via a pre-commit hook. This ensures contract violations are caught locally before code is pushed.

The hook uses resolver-backed `validate:local`. If the resolved source is a local checkout and it has not been built yet, run:

```bash
# Build the resolved local checkout once
pnpm run interfacectl:build

# Or use the CI validation script, which prints provenance and builds local sources automatically
pnpm validate:ci
```

The pre-commit hook is managed via [husky](https://typicode.github.io/husky/) and runs `pnpm validate:local` before each commit.

To bypass the pre-commit hook (not recommended):

```bash
git commit --no-verify
```

## Project Structure

```
surfaces-webapps/
├── apps/
│   ├── surfaces-web/        # Surfaces landing page
│   ├── surfaceops-web/      # SurfaceOps marketing/download site + workbench source
│   ├── surfaceops-desktop/  # SurfaceOps Electron desktop alpha
│   ├── interfacectl-web/    # InterfaceCTL landing page
│   ├── surfaces-dev/        # Developer documentation
│   └── reference-target-web/ # Governance reference fixture
├── packages/
│   └── ui/                  # Shared UI components
│       ├── components/      # Navigation, etc.
│       ├── tokens/          # Design tokens
│       └── utils/           # Motion utilities
└── contracts/               # Interface contracts

```
