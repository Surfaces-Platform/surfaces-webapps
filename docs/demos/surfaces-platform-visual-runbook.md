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
pnpm dev:surfaceops
```

Then run the full demo sequence:

```bash
pnpm run demo:all:visual
```

## Expected outputs checklist
1. Bootstrap: contract/extraction generated, `validate-extracted` passes, run event emitted (`bootstrap`, `pass|warn`).
2. Generation: intentional guard failure (`shell-owned-primitive-emitted`) followed by pass.
3. CI/CD: intentional `phase0.authPosture.mismatch` failure (exit 30) followed by canonical pass.
4. Runtime: section-missing blocked, raw-color probe policy-aware (`strict=>422` else `200`), valid request passes.

## Optional step-by-step commands
```bash
pnpm run demo:bootstrap:promote
pnpm run demo:generation
pnpm run demo:ci:surfaceops
pnpm run demo:runtime:surfaceops
```

## SurfaceOps pages
- Runs list: `http://localhost:3001/contracts/runs`
- Surface detail: `http://localhost:3001/contracts/runs/surfaces-web`

## Troubleshooting
1. `surfaces-web` not reachable:
   - confirm `pnpm dev:surfaces` is running.
2. `surfaceops-web` not reachable:
   - confirm `pnpm dev:surfaceops` is running.
3. CLI artifacts missing:
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
