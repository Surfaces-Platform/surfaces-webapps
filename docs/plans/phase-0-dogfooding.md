# Phase 0: What This Surface Guarantees

This document describes what Phase 0 guarantees today for Surfaces web applications. These guarantees are enforced by extraction and validation tooling in CI.

## What Phase 0 Guarantees

For each surface declared in `surfaces.web.contract.json`, Phase 0 guarantees the following, as expressed in `surfaces[].phase0`:

1. **Auth posture**
   - The surface declares its authentication posture explicitly.
   - Current supported values:
     - `public`
     - `auth-aware`
     - `auth-first`
   - Validation ensures the extracted auth signals match the declared posture.

2. **Shell presence**
   - `requiresShell: true` guarantees the surface renders within a shared layout shell.
   - Extraction checks for a valid Next.js `app/layout.tsx` or equivalent shell structure.

3. **Auth routes**
   - `expectsAuthRoutes: true` guarantees auth-related routes exist when the surface is auth-aware or auth-first.
   - Extraction checks for `/auth/*` routes in the app router.

4. **Design system usage**
   - `expectsDesignSystem: true` guarantees the surface uses `@surfaces/ui`.
   - Extraction scans imports to confirm design system usage.

5. **Domain identity**
   - Each surface declares a canonical production domain via `domain`.
   - This is informational in Phase 0 and used for clarity, routing, and future enforcement.

## What Phase 0 Does Not Guarantee

Phase 0 explicitly does not guarantee:

- Section structure or layout fidelity
- Typography, color, or spacing correctness
- Component hierarchy or JSX structure
- Runtime behavior or data correctness
- Visual parity across surfaces

These are intentionally out of scope until later phases.

## Enforcement Model

- Facts are extracted from code (`generate-contract`).
- Expectations are declared in the contract (`phase0`).
- Mismatches fail CI via `validate-extracted`.

Phase 0 is descriptive and enforceable, not aspirational.
