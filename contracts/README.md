# Surfaces Web Contract

This directory holds the interface contract for Surfaces web applications and the artifacts produced by extraction.

## Files

| File | Purpose |
|------|---------|
| `surfaces.web.contract.json` | **Policy contract** — Declared expectations for all surfaces. Source of truth for Phase 0 policy. |
| `surfaces.web.contract.schema.json` | JSON Schema for the contract format. |
| `generated/*` | Extracted artifacts from `interfacectl generate-contract`. Committed so CI can compare without re-running extraction. **Drift rules:** CI fails when committed `generated/*` differs from a fresh run; fix by regenerating and committing. See [generated/README.md](generated/README.md). |

## Contract fields (surfaces)

Each entry in `surfaces[]` describes one web app. Key fields:

### `id`, `displayName`, `type`

- `id` — Surface identifier (e.g. `surfaces-web`, `surfaces-dev`). Must match the app directory mapping in `interfacectl.config.json`.
- `displayName` — Human-readable name.
- `type` — `"web"` for Next.js apps.

### `domain`

**Informational.** Canonical production domain for the surface (e.g. `www.surfaces.systems`). Used for clarity, routing, and future enforcement. Phase 0 does not enforce domain correctness.

### `phase0`

Phase 0 policy block. Declares what the surface **expects**; `validate-extracted` compares these to extracted reality and fails CI on mismatch.

| Field | Type | Description |
|-------|------|-------------|
| `authPosture` | `"public"` \| `"auth-aware"` \| `"auth-first"` | Declared auth posture. Validation ensures extracted auth signals match. |
| `requiresShell` | boolean | `true` ⇒ surface must render within a shared layout shell. Extraction checks for `app/layout.tsx` or `app/(shell)/layout.tsx`. |
| `expectsAuthRoutes` | boolean | `true` ⇒ `/auth/login`, `/auth/callback`, `/auth/session`, `/auth/logout` must exist when auth-aware or auth-first. |
| `expectsDesignSystem` | boolean | `true` ⇒ surface must use `@surfaces/ui`. Extraction scans imports. |

### Other fields

- `requiredSections`, `allowedFonts`, `layout` — Used by `interfacectl validate` for full contract compliance (beyond Phase 0).
- `sections[]`, `constraints` — Shared section definitions and motion/typography constraints.

## Enforcement pipeline

1. **generate-contract** — Extracts facts from code into `contracts/generated/*`.
2. **validate** — Full contract compliance (sections, fonts, layout).
3. **validate-extracted** — Compares `surfaces[].phase0` expectations to extracted reality; mismatches fail CI.
4. **Drift check** — CI compares committed `generated/*` to a fresh run; differences fail the job.

See [docs/plans/phase-0-dogfooding.md](../docs/plans/phase-0-dogfooding.md) for what Phase 0 guarantees and what it does not.
