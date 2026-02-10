# Surfaces Platform Visual Demo Runbook

Audience: exec and buyer stakeholders  
Format: live demo runbook (terminal + UI)  
Duration: 20 minutes total

## Goal
Show that a single contract is:
1. Bootstrapped from real surface source
2. Enforced at generation time
3. Enforced at CI/CD time
4. Enforced at runtime (edge)

SurfaceOps UI is used as the visual operations layer for CI/runtime evidence.

## Pre-demo Checklist (5-10 minutes before start)
1. Install dependencies from repo root:
```bash
pnpm install
```
2. Build interfacectl once:
```bash
pnpm run interfacectl:build
```
3. Ensure apps are running:
```bash
pnpm dev:surfaces
pnpm dev:surfaceops
```
4. Verify Surfaces runtime route is reachable:
```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/adaptive/test?section=hero"
```
Expected: `200`
5. Verify SurfaceOps auth session state:
```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/auth/session"
```
Expected:
- `200` authenticated
- `401` not logged in yet (login in browser before Demo 3 visual segment)
6. Optional browser tabs to pre-open:
- `http://localhost:3000/demos/generation`
- `http://localhost:3000/adaptive/test?section=hero`
- `http://localhost:3001/contracts/runs`
- `http://localhost:3001/contracts/runs/surfaces-web`

## Timeline
1. Demo 0 (Bootstrap contract artifacts): 4 min
2. Demo 1 (Generation time): 4 min
3. Demo 2 (CI/CD + SurfaceOps): 7 min
4. Demo 3 (Runtime + SurfaceOps): 5 min

## Demo 0: Bootstrap Contract Artifacts (4 min)
Command:
```bash
pnpm run demo:bootstrap -- --promote
```

What to narrate:
1. "We start by extracting the surface area from app source."
2. "`generate-contract` writes fresh contract/extraction artifacts and promotes them to `contracts/generated/`."
3. "`validate-extracted` proves bootstrap output aligns with canonical contract semantics."
4. "This is how we keep source reality and contract expectations connected."

Expected visible proof:
- Artifact paths printed for bootstrapped contract and extraction
- `validate-extracted` pass
- Bootstrap run event emitted to `contracts/generated/contract-runs.json`
- Summary block with contract/surface/section/route counts

## Demo 1: Generation-time Enforcement (4 min)
Command:
```bash
pnpm run demo:generation
```

What to narrate:
1. "This is pre-emit enforcement. We block banned primitives before code lands."
2. "Bad descriptor intentionally emits shell-owned `navigation` from non-allowlisted source and fails with code `2`."
3. "Good descriptor uses allowlisted shell source and passes."

Expected visible proof:
- Terminal fail -> pass sequence
- Finding marker: `shell-owned-primitive-emitted`
- Optional page: `http://localhost:3000/demos/generation`

## Demo 2: CI/CD Enforcement + SurfaceOps Visibility (7 min)
Command:
```bash
pnpm run demo:ci:surfaceops
```

What to narrate:
1. "These checks mirror deterministic CI steps."
2. "We intentionally create a bad extraction (`authAware=false`) and enforce via `validate-extracted`."
3. "The command fails with exit `30` and code `phase0.authPosture.mismatch`."
4. "Canonical extraction passes again, showing controlled remediation."
5. "Now we shift to SurfaceOps UI for operational visibility."

Visual sequence:
1. Open `http://localhost:3001/contracts/runs`
2. Open `http://localhost:3001/contracts/runs/surfaces-web`
3. Point out status/findings/next-steps alignment with terminal finding codes

## Demo 3: Runtime Edge Enforcement + SurfaceOps Correlation (5 min)
Command:
```bash
pnpm run demo:runtime:surfaceops
```

What to narrate:
1. "Runtime checks happen before adaptive UI render."
2. "Missing section request is blocked with `sections.required`."
3. "Raw color proposal is blocked with `color.rawValues`."
4. "Valid request proceeds."
5. "SurfaceOps keeps CI/runtime contract semantics legible for operators."

Visual sequence:
1. Show terminal HTTP assertions (`422`, `422`, `200`)
2. Open adaptive route: `http://localhost:3000/adaptive/test?section=hero`
3. Return to SurfaceOps detail: `http://localhost:3001/contracts/runs/surfaces-web`

## Fallbacks During Live Demo
1. SurfaceOps auth expired (`401` on `/auth/session`):
- Open `http://localhost:3001/auth/login?returnTo=/contracts/runs`
- Resume at `/contracts/runs/surfaces-web`
2. Surfaces app not running:
- Start `pnpm dev:surfaces`
- Re-run `pnpm run demo:runtime:surfaceops`
3. interfacectl dist missing:
- Run `pnpm run interfacectl:build`
- Re-run `pnpm run demo:bootstrap`

## One-command sequence (optional)
```bash
pnpm run demo:all:visual
```

This runs bootstrap (promoted) + generation + CI + runtime demos in sequence from repo root.
