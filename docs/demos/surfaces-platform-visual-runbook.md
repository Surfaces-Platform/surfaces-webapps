# Surfaces Platform Visual Demo Runbook (Simplified E2E)

Audience: exec and buyer stakeholders  
Format: live terminal + SurfaceOps UI  
Duration: 12-15 minutes

## Goal
Prove end-to-end contract control across:
1. bootstrap
2. generation
3. CI/CD
4. runtime

## Preconditions (strict)
Start these before running demos:

```bash
pnpm install
pnpm run interfacectl:build
pnpm dev:surfaces
pnpm dev:reference-target
pnpm dev:surfaceops
```

Then run the full demo sequence:

```bash
pnpm run demo:all:visual
```

## Expected outputs checklist
1. Bootstrap: contract/extraction generated for `reference-target-web`, `validate-extracted` passes, run event emitted (`bootstrap`, `pass|warn`).
2. Generation: intentional guard failure (`shell-owned-primitive-emitted`) followed by pass, plus icon-input visibility probe that confirms no generation-time icon enforcement.
3. CI/CD: icon policy segment shows `icon.source-disallowed` as warn (`exit 0`) then strict (`exit 20`), followed by malformed extraction failure (`phase0.load.extracted`, exit 10) and canonical pass.
4. Runtime: section-missing blocked, raw-color probe policy-aware (`strict=>422` else `200`), icon-source header remains non-blocking, valid request passes.

## Optional step-by-step commands
```bash
pnpm run demo:bootstrap:promote
pnpm run demo:generation
pnpm run demo:ci:surfaceops
pnpm run demo:runtime:surfaceops
```

## SurfaceOps pages
- Runs list: `http://localhost:3001/contracts/runs`
- Surface detail (bootstrap): `http://localhost:3001/contracts/runs/reference-target-web`
- Surface detail (generation): `http://localhost:3001/contracts/runs/surfaces-web`
- Surface detail (ci/runtime): `http://localhost:3001/contracts/runs/reference-target-web`

## Troubleshooting
1. `surfaces-web` not reachable:
   - confirm `pnpm dev:surfaces` is running.
2. `reference-target-web` not reachable:
   - confirm `pnpm dev:reference-target` is running.
3. `surfaceops-web` not reachable:
   - confirm `pnpm dev:surfaceops` is running.
4. CLI artifacts missing:
   - run `pnpm run interfacectl:build`.

## Governance Inspector Demos (Reference Target)
Run these with SurfaceOps and the neutral fixture:

```bash
pnpm dev:surfaceops
pnpm dev:reference-target
```

Duplicate-nav regression scenario:

```bash
node scripts/demos/demo-governance-inspector.mjs --scenario duplicate-nav --headless
```

`nng.5.error-prevention` scenario (baseline guarded -> violating unguarded):

```bash
node scripts/demos/demo-governance-inspector.mjs --scenario nng5-error-prevention --headless
```
