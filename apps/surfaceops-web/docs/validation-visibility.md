# SurfaceOps validation visibility (spec stub)

Purpose: let SurfaceOps show the latest validation state without changing enforcement semantics.

## Inputs
- JSON artifact from CI: `interfacectl-report.json` (per the CI templates).
- Contract diff summary (optional): git diff of `contracts/surfaces.web.contract.json` or generated artifacts.

## Minimal API shape for UI ingestion
```json
{
  "surfaceId": "surfaces-web",
  "commit": "abc123",
  "branch": "feature/foo",
  "status": "pass|fail|warn",
  "violations": [
    {
      "rule": "color.disallowed",
      "policy": "warn",
      "file": "apps/surfaces-web/app/globals.css",
      "line": 34,
      "value": "rgba(15, 23, 42, 0.3)"
    }
  ],
  "generatedAt": "2026-02-07T12:00:00Z",
  "contract": { "id": "surfaces.web", "version": "0.1.0" }
}
```

## UI checklist
- Per-surface last run status (pass/fail/warn) with commit/branch.
- Link to artifact download.
- Top 3 violation rows with file/line and rule.
- Contract version + diff link (if available).
- Empty state when no artifacts yet.

## Current canonical icon-policy semantics
- `surfaces-web` icon-source violations are blocking (`icons.policy: "strict"`).
- `interfacectl-web`, `surfaceops-web`, and `surfaces-dev` icon-source violations remain non-blocking (`icons.policy: "warn"`).
- Runtime icon enforcement is still out of scope; these statuses come from CI/CD-time validation artifacts.

## Non-goals
- No workflow actions (assign, mute, retry).
- No runtime telemetry; this is build/CI only.

## Next steps
- Add ingestion endpoint that accepts the JSON artifact.
- Wire SurfaceOps page section using the shape above.
