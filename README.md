# Surfaces Platform Web Monorepo

This monorepo contains three Next.js web applications for the Surfaces Platform:

- **surfaces-web** - Canonical source of interface truth (surfaces.systems)
- **surfaceops-web** - Operational enforcement and monitoring (surfaceops.ai)
- **interfacectl-web** - Executable interface control (interfacectl.com)

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
```

### Running All Apps

To run all three apps concurrently:

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
```

### Local Development URLs

- Surfaces: http://localhost:3000
- SurfaceOps: http://localhost:3001
- InterfaceCTL: http://localhost:3002

## Production Domains

When deployed, each app runs on its own domain:

- Surfaces: https://surfaces.systems
- SurfaceOps: https://surfaceops.ai
- InterfaceCTL: https://interfacectl.com

The Navigation component automatically detects the environment and routes to the correct domains in production, or localhost ports in development.

## Environment Variables (Optional)

You can customize the development URLs by setting environment variables in each app:

- `NEXT_PUBLIC_SURFACES_URL` - Default: `http://localhost:3000`
- `NEXT_PUBLIC_SURFACEOPS_URL` - Default: `http://localhost:3001`
- `NEXT_PUBLIC_INTERFACECTL_URL` - Default: `http://localhost:3002`

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
```

This runs `tsc --noEmit` for each package, catching type errors before pushing to Vercel.

## Contract Validation

Validate interface contract compliance:

```bash
pnpm validate:contract
```

This runs `interfacectl validate` against the contract defined in `contracts/surfaces.web.contract.json`.

## Project Structure

```
surfaces-monorepo/
├── apps/
│   ├── surfaces-web/        # Surfaces landing page
│   ├── surfaceops-web/      # SurfaceOps landing page
│   └── interfacectl-web/    # InterfaceCTL landing page
├── packages/
│   └── ui/                  # Shared UI components
│       ├── components/      # Navigation, etc.
│       ├── tokens/          # Design tokens
│       └── utils/           # Motion utilities
└── contracts/               # Interface contracts

```

