# Reference Target Model

## Purpose
This model keeps governance demos customer-first while preserving support for arbitrary public URLs.

## Authority Model
1. Product authority is the tenant contract and governance state owned in SurfaceOps.
2. First-party websites (including `surfaces.systems`) are internal dogfood targets only.
3. The reference target is a neutral hosted fixture used for deterministic demos.
4. Bring-your-own URL targets remain supported for exploratory checks.

## Target Modes
1. `Reference`
- Uses a registry profile (`reference_customer_v1`) and deterministic markup.
- Intended for repeatable demos and baseline walkthroughs.

2. `BYO URL`
- Accepts arbitrary HTTP/HTTPS targets.
- Intended for exploratory inspection where marker fidelity may be incomplete.

## Reliability Tiers
1. `full`
- Deterministic reference profile with expected telemetry fidelity.
- Blocking severities are preserved.

2. `degraded`
- BYO URL runs or marker-fidelity gaps.
- Marker-dependent blocking checks are downgraded to warnings.
- UI explicitly shows degraded reasons.

## Why this split exists
Using `surfaces.systems` as the implied default caused dogfood context to be interpreted as product authority. The reference target model removes that ambiguity and keeps customer governance semantics clear.

## Environment
- `NEXT_PUBLIC_GOVERNANCE_REFERENCE_TARGET_URL`
  - Required in production for SurfaceOps inspector defaults.
  - Defaults to `http://localhost:3004/` in development.
