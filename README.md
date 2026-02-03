# Surfaces Platform Web Monorepo

This monorepo contains four Next.js web applications for the Surfaces Platform:

- **surfaces-web** - Canonical source of interface truth (surfaces.systems) — auth-aware, public by default
- **surfaceops-web** - Operational enforcement and monitoring (surfaceops.ai) — auth-first workflows
- **interfacectl-web** - Executable interface control (interfacectl.com) — auth-aware, public by default
- **surfaces-dev** - Developer documentation and reference (surfaces.dev) — auth-aware, public by default

## Local Development

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

# Run interfacectl-web on port 3002
pnpm dev:interfacectl
# or
cd apps/interfacectl-web && pnpm dev

# Run surfaces-dev on port 3003
pnpm dev:surfaces-dev
# or
cd apps/surfaces-dev && pnpm dev
```

### Running All Apps

To run all four apps concurrently:

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
```

### Local Development URLs

- Surfaces: http://localhost:3000
- SurfaceOps: http://localhost:3001
- InterfaceCTL: http://localhost:3002
- Surfaces.dev: http://localhost:3003

## Auth posture

All apps expose the same `/auth` routes (login, callback, session, logout) to support SSO across domains. surfaces.systems, surfaces.dev, and interfacectl.com are public by default in v1 but are auth-aware. surfaceops.ai is the first place where authenticated workflows will matter. SSO continuity is provided by shared /auth routes across all surfaces. Page-level access control is owned per app and is intentionally minimal outside surfaceops in v1.

## Production Domains

When deployed, each app runs on its own domain:

- Surfaces: https://surfaces.systems
- SurfaceOps: https://surfaceops.ai
- InterfaceCTL: https://interfacectl.com
- Surfaces.dev: https://surfaces.dev

The Navigation component automatically detects the environment and routes to the correct domains in production, or localhost ports in development.

## Environment Variables (Optional)

You can customize the development URLs by setting environment variables in each app:

- `NEXT_PUBLIC_SURFACES_URL` - Default: `http://localhost:3000`
- `NEXT_PUBLIC_SURFACEOPS_URL` - Default: `http://localhost:3001`
- `NEXT_PUBLIC_INTERFACECTL_URL` - Default: `http://localhost:3002`
- `NEXT_PUBLIC_SURFACES_DEV_URL` - Default: `http://localhost:3003`

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
# Local development: uses workspace CLI (assumes already built)
pnpm validate:local

# CI/production: builds CLI from source, then validates
pnpm validate:ci
```

**Validation strategy:** 
- `validate:local` uses the workspace-linked CLI for fast local iteration (assumes packages are already built).
- `validate:ci` builds the CLI packages from source in the current repo commit, then runs validation. This ensures deterministic, clean validation in CI/prod environments.

Check CLI provenance:
```bash
# Local dev provenance
pnpm cli:where:local

# CI/prod provenance (after build)
pnpm cli:where:ci
```

This runs `interfacectl validate` against the contract defined in `contracts/surfaces.web.contract.json`.

### Pre-commit Hooks

Interface contract validation runs automatically before each commit via a pre-commit hook. This ensures contract violations are caught locally before code is pushed.

The hook uses `validate:local`, which requires the interfacectl CLI packages to be built. If you see build errors, run:

```bash
# Build the CLI packages once
pnpm --filter @surfaces/interfacectl-validator run build
pnpm --filter @surfaces/interfacectl-cli run build

# Or use the CI validation script which builds automatically
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
│   ├── surfaceops-web/      # SurfaceOps landing page
│   ├── interfacectl-web/    # InterfaceCTL landing page
│   └── surfaces-dev/        # Developer documentation
├── packages/
│   └── ui/                  # Shared UI components
│       ├── components/      # Navigation, etc.
│       ├── tokens/          # Design tokens
│       └── utils/           # Motion utilities
└── contracts/               # Interface contracts

```

