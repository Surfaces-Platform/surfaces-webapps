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

## Post-merge monitoring (2026-02-18)
- PR-A merged: `#34` at `2026-02-18T05:42:43Z` (`cd3fd739e8df26cb209a0de66b8704b96bf1e70a`).
- PR-B merged: `#36` at `2026-02-18T05:44:56Z` (`0927c59e9bcce389ba0f558393545d9b52273f50`).
- Stacked interim PR `#35` was closed after base-branch cleanup and superseded by `#36`.

Post-merge spot checks (rerun on `main`) passed:
- `node tools/interfacectl/packages/interfacectl-cli/dist/index.js validate --workspace-root . --contract ./contracts/surfaces.web.contract.json --format json --exit-codes v2` ✅
- `pnpm run adapter:validate-generation --tool codex --surface surfaces-web --mode workspace --workspace-root . --contract ./contracts/surfaces.web.contract.json` ✅ (`status: pass`, evaluated at `2026-02-18T05:45:14.585Z`)
