# 2026-02-18 — Warn-First Icon Policy Rollout (Post-Merge Verification)

## Scope
Post-merge verification for the warn-first icon policy rollout completed across `interfacectl` and `surfaces-webapps`.

## Merged changes
- `interfacectl` PR #20
  - URL: https://github.com/Surfaces-Platform/interfacectl/pull/20
  - Merge commit: `03f3343fd8437d8975c3d28cac2b044832e65827`
- `surfaces-webapps` PR #32
  - URL: https://github.com/Surfaces-Platform/surfaces-webapps/pull/32
  - Merge commit: `22bbff933d0912aa6132e8efca8ce737116555c5`

## Contract rollout status
Warn-first icon policy is present for all canonical web surfaces in `contracts/surfaces.web.contract.json`:
- `interfacectl-web`
- `surfaceops-web`
- `surfaces-web`
- `surfaces-dev`

Each surface currently uses:
- `icons.policy: "warn"`
- `icons.allowedSources` seeded from generated extraction artifacts.

No canonical surface was promoted to `icons.policy: "strict"` in this increment.

## Verification results
Validation and adapter checks were rerun on merged `main`:

- `interfacectl`
  - `pnpm install --frozen-lockfile` ✅
  - `pnpm run build` ✅
  - `pnpm test` ✅

- `surfaces-webapps`
  - `pnpm run interfacectl:build` ✅
  - `pnpm run generate:contract:all` ✅
  - `node tools/interfacectl/packages/interfacectl-cli/dist/index.js validate --workspace-root . --contract ./contracts/surfaces.web.contract.json --format json --exit-codes v2` ✅ (0 findings)
  - `pnpm run adapter:validate-generation --tool codex --surface surfaces-web --mode workspace --workspace-root . --contract ./contracts/surfaces.web.contract.json` ✅ (`status: pass`)
  - `pnpm run test:scripts` ✅
  - `pnpm run type-check` ✅

## CI/check status after merge
- `interfacectl` PR checks:
  - `ci (18.20.0)` ✅
  - `ci (20.x)` ✅
  - `Vercel` ❌ (non-gating in current repo behavior)

- `surfaces-webapps` PR checks:
  - `Validate Contract` ✅
  - `Validate surfaces against contract` ✅
  - `Onboarding Browser Smoke` ✅
  - `SurfaceOps DB Tests` ✅
  - All Vercel domain checks ✅

## Production deploy status
`pnpm run vercel:check` against contract-derived production domains reported `status: Ready` for:
- `www.interfacectl.com`
- `www.surfaceops.ai`
- `www.surfaces.systems`
- `www.surfaces.dev`

Check timestamp observed during this verification run:
- `Tue Feb 17 2026 21:03:09 PST`

## Follow-up recommendations
- Keep icon policy in `warn` while monitoring new findings volume and false positives.
- Define strict-graduation thresholds per surface (for example: sustained zero false positives + stable remediation cycle).
- Promote surfaces individually to `icons.policy: "strict"` in separate, auditable PRs.
- Use the reference-target pilot gate before canonical strict promotion:
  - Runbook: [`docs/interfacectl/icon-strict-pilot.md`](../icon-strict-pilot.md)
  - Command: `pnpm run pilot:icons:reference-target`
