# 2026-02-18 — `surfaces-web` Icon Policy Strict Promotion

## Scope
Promote the first canonical surface (`surfaces-web`) from `icons.policy: "warn"` to `icons.policy: "strict"` after the reference-target strict pilot gate.

## Canonical contract change
Updated `contracts/surfaces.web.contract.json`:
- `surfaces[id="surfaces-web"].icons.policy`: `warn` -> `strict`

Current canonical icon policy state:
- `interfacectl-web`: `warn`
- `surfaceops-web`: `warn`
- `surfaces-web`: `strict`
- `surfaces-dev`: `warn`

## Regeneration and sync
Executed:
- `pnpm run interfacectl:build` ✅
- `pnpm run generate:contract:all` ✅

Result:
- Generated contracts remained deterministic for this policy-level promotion (no additional generated artifact diffs required).

## Verification
Executed and passed:
- `node tools/interfacectl/packages/interfacectl-cli/dist/index.js validate --workspace-root . --contract ./contracts/surfaces.web.contract.json --format json --exit-codes v2` ✅
- `pnpm run adapter:validate-generation --tool codex --surface surfaces-web --mode workspace --workspace-root . --contract ./contracts/surfaces.web.contract.json` ✅ (`status: pass`)
- `pnpm run test:scripts` ✅
- `pnpm run type-check` ✅

Deployment readiness snapshot:
- `pnpm run vercel:check` ✅
- Timestamp observed: `Tue Feb 17 21:30:18 PST 2026`
- Domains checked: `www.interfacectl.com`, `www.surfaceops.ai`, `www.surfaces.systems`, `www.surfaces.dev` (all `Ready`)

## Rollback
Single-line rollback change:
- Set `surfaces[id="surfaces-web"].icons.policy` back to `"warn"` in `contracts/surfaces.web.contract.json`.

Then rerun:
- `pnpm run generate:contract:all`
- `node tools/interfacectl/packages/interfacectl-cli/dist/index.js validate --workspace-root . --contract ./contracts/surfaces.web.contract.json --format json --exit-codes v2`
