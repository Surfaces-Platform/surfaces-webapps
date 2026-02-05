# Phase 0 Stress Test: Intentional Failure Exercise

Goal: Validate that Phase 0 enforcement fails clearly and usefully when a surface violates its declared expectations.

## Exercise Setup

Choose exactly one surface. Recommended: `surfaces-dev`.

Pick one of the following violations:

### Option A: Design system violation
- Remove all `@surfaces/ui` imports from the surface.
- Do not update the contract.

Expected result:
- `validate-extracted` fails with:
  - `phase0.designSystem.missing`
- CI exit code indicates mismatch.

### Option B: Auth posture violation
- Remove `/app/auth/*` routes.
- Leave `authPosture: "auth-aware"` and `expectsAuthRoutes: true`.

Expected result:
- `validate-extracted` fails with:
  - `phase0.authRoutes.missing`

### Option C: Shell violation
- Remove or bypass the shared layout shell.
- Leave `requiresShell: true`.

Expected result:
- `validate-extracted` fails with:
  - `phase0.shell.mismatch`

## Decision Point After Failure

For the chosen violation, decide:

- Should the **code** change to meet the contract?
- Or should the **contract** change to reflect reality?

Document the decision and rationale.

This exercise is required before expanding Phase 1.
