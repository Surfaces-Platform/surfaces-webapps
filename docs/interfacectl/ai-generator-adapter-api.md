# AI Generator Adapter API

This document defines the stable request/response contract for the Surfaces Generation Adapter.

Schema files in repo:

- `scripts/adapter/schemas/generation-adapter-request.schema.json`
- `scripts/adapter/schemas/generation-adapter-response.schema.json`

## Request schema

```json
{
  "requestId": "uuid",
  "tool": "codex|cursor|lovable|figma-make",
  "surfaceId": "reference-target-web",
  "mode": "workspace|descriptor",
  "workspaceRoot": "/absolute/path/optional",
  "descriptor": [
    {
      "surfaceId": "reference-target-web",
      "primitives": [],
      "colors": [],
      "icons": [{ "value": "@heroicons/react/24/outline", "source": "generated.tsx" }]
    }
  ],
  "contractPath": "/absolute/path/optional",
  "provenance": {
    "sessionId": "string",
    "userId": "string",
    "timestamp": "ISO-8601"
  }
}
```

Field notes:

- `mode=workspace` requires `workspaceRoot`.
- `mode=descriptor` requires `descriptor`.
- `descriptor[].icons` is optional but recommended when icon policy is enabled.
- If `contractPath` is omitted, adapter defaults to `contracts/surfaces.web.contract.json`.

## Response schema

```json
{
  "requestId": "uuid",
  "status": "pass|warn|block",
  "surfaceId": "reference-target-web",
  "contract": {
    "id": "surfaces.web",
    "version": "0.1.0"
  },
  "coverage": {
    "generationGuard": true,
    "fullValidate": true,
    "shellBoundaryEvaluated": true,
    "colorPolicyEvaluated": true,
    "iconPolicyEvaluated": true
  },
  "findings": [
    {
      "code": "color.disallowed|icon.source-disallowed|shell-owned-primitive-emitted|...",
      "severity": "error|warning",
      "policy": "strict|warn|off",
      "message": "human-readable",
      "location": {
        "file": "path",
        "line": 0
      },
      "evidence": {}
    }
  ],
  "timings": {
    "totalMs": 0
  }
}
```

## Status semantics

- `block` when any strict/error finding exists.
- `warn` when only warnings exist.
- `pass` when no findings exist.

Coverage semantics:

- `mode=workspace` sets `coverage.fullValidate=true`.
- `mode=descriptor` sets `coverage.fullValidate=false` (generation guard only).
- `coverage.shellBoundaryEvaluated` indicates shell ownership boundary checks were evaluated.
- `coverage.colorPolicyEvaluated` indicates descriptor color policy parity checks were evaluated for this surface.
- `coverage.iconPolicyEvaluated` indicates descriptor icon policy parity checks were evaluated for this surface.

## Descriptor parity rollout controls

Adapter rollout config defaults to:

- `contracts/generation-descriptor-parity.json`

Override options:

- `SURFACES_ADAPTER_DESCRIPTOR_PARITY_CONFIG` (path override)
- `SURFACES_ADAPTER_DESCRIPTOR_PARITY_SURFACES` (comma-separated surface IDs)

## Error model

- `400`: invalid request or malformed adapter input.
- `422`: valid request with blocking findings (`status=block`).
- `200`: `status=pass|warn`.

CLI exit code model:

- `0`: pass or warn
- `30`: block
- `10`: malformed adapter input/unreadable contract

## Security notes

- Default bind host is `127.0.0.1`.
- Non-local bind requires token configuration.
- Token header is configurable.
- Request logging redacts obvious secret-like fields.

## Versioning policy

- Request/response shapes are stable integration contracts.
- Additive fields are backward compatible.
- Breaking schema/semantic changes require coordinated version updates in docs and consumers.

## Related docs

- [Quick Start](./ai-generator-adapter-quickstart.md)
- [Tool Playbooks](./ai-tool-playbooks.md)
