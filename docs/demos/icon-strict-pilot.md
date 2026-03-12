# Reference-Target Icon Strict Pilot Runbook

This runbook captures the demo-only strict pilot gate for icon source policy before canonical strict promotion.

## Scope
- Uses the existing reference-target demo flow and temporary icon fixture.
- Does not change canonical surface policies.

## Primary command

```bash
pnpm run pilot:icons:reference-target
```

This command runs `scripts/verify-icon-strict-pilot.mjs`, which executes `scripts/demos/demo-ci-surfaceops.sh` in `ICON_PILOT_MODE=both` and verifies exported pilot artifacts.

## Expected outcomes
- Warn path emits `icon.source-disallowed` with `severity: "warning"` and non-blocking exit code `0`.
- Strict path emits `icon.source-disallowed` with `severity: "error"` and blocking exit code `20` (`--exit-codes v2`).
- Verifier exits non-zero if any condition is missing or mismatched.

## Optional manual execution

```bash
# Warn-only pilot path
ICON_PILOT_MODE=warn ./scripts/demos/demo-ci-surfaceops.sh

# Strict-only pilot path
ICON_PILOT_MODE=strict ./scripts/demos/demo-ci-surfaceops.sh

# Both paths (default)
ICON_PILOT_MODE=both ./scripts/demos/demo-ci-surfaceops.sh
```

Optional export for audit/debug:

```bash
ICON_PILOT_OUTPUT_DIR=/tmp/icon-pilot ICON_PILOT_MODE=both ./scripts/demos/demo-ci-surfaceops.sh
```

Exported files:
- `/tmp/icon-pilot/icon.warn.report.json`
- `/tmp/icon-pilot/icon.warn.meta.json`
- `/tmp/icon-pilot/icon.strict.report.json`
- `/tmp/icon-pilot/icon.strict.meta.json`

## Pass criteria
- `pnpm run pilot:icons:reference-target` exits `0`.
- Verifier output includes successful warn/strict assertions for `icon.source-disallowed`.
- No canonical contract policy changes are included in the pilot PR.
