# Vercel Deployment Configuration for surfaces.dev

## Settings

The following Vercel settings should be used when deploying `surfaces-dev` to match the existing apps' deployment patterns:

### Project Settings

Local/sandbox note: Turbopack may fail in this environment (port binding + blocked font fetch). Use webpack locally:

```
pnpm exec next build --webpack
```

JetBrains Mono is loaded via a `<link>` tag in `app/layout.tsx` to avoid `next/font` network fetches.


- **Framework Preset**: Next.js
- **Root Directory**: `apps/surfaces-dev`
- **Build Command**: (Leave as default - Next.js auto-detection)
- **Output Directory**: `.next` (default)
- **Install Command**: `pnpm install --frozen-lockfile`
- **Node.js Version**: (Use default or match other apps)

### Production Domain

- **Production Domain**: `surfaces.dev`

### Environment Variables

No environment variables are required for the documentation site. The Navigation component uses environment variables for cross-app linking in development, but these are optional and use sensible defaults.

### How This Matches Existing Apps

All existing apps (surfaces-web, surfaceops-web, interfacectl-web) use the same deployment pattern:
- Framework preset: Next.js
- Root directory: `apps/{app-name}`
- Build command: Default (Next.js auto-detection)
- Install command: `pnpm install --frozen-lockfile`
- No `vercel.json` files (all configuration in dashboard)

This ensures consistent deployment behavior across all apps in the monorepo.