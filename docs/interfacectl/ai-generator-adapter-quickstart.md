# AI Generator Adapter Quick Start

This quick start shows how to integrate a single Surfaces Generation Adapter with Codex, Cursor, Lovable, and Figma Make.

## Purpose

The adapter evaluates generated UI against the canonical contract at:

- `contracts/surfaces.web.contract.json`

It returns a consistent verdict contract:

- `pass`
- `warn`
- `block`

## 5-step integration flow

1. Load the canonical contract.
2. Send generated output to the adapter in `workspace` or `descriptor` mode.
3. Run generation guard checks (shell-owned primitives + color policy).
4. In `workspace` mode, also run `interfacectl validate`.
5. Use verdict and findings to decide regenerate/continue/block.

## CLI mode (local or IDE agents)

```bash
pnpm run adapter:validate-generation -- \
  --tool codex \
  --surface reference-target-web \
  --mode workspace \
  --workspace-root /absolute/path/to/workspace \
  --contract /absolute/path/to/contracts/surfaces.web.contract.json
```

Exit semantics:

- `0` for `pass` and `warn`
- `30` for `block`
- `10` for malformed adapter input/unreadable contract

## HTTP mode (hosted tools)

Endpoint:

- `POST /surfaces.validateGeneration`

Request (conceptual):

```json
{
  "requestId": "uuid",
  "tool": "lovable",
  "surfaceId": "reference-target-web",
  "mode": "descriptor",
  "descriptor": [
    {
      "surfaceId": "reference-target-web",
      "primitives": [],
      "colors": [{ "value": "var(--background)", "source": "generated.css" }]
    }
  ]
}
```

Response codes:

- `200` with `status=pass|warn`
- `422` with `status=block`
- `400` for invalid request

## Verdict semantics

- `block`: at least one strict/error finding exists.
- `warn`: findings exist but none are strict errors.
- `pass`: no findings exist.

## Troubleshooting

- `400`/exit `10`: invalid adapter request shape, bad descriptor JSON, missing contract, or unknown surface.
- `422`/exit `30`: strict policy hit (`color.disallowed`, `icon.source-disallowed`, shell-owned primitive emission, or other error finding).
- Descriptor-mode promotion gaps: add CI fallback with full workspace validation before merge/deploy.

## Next docs

- [Adapter API](./ai-generator-adapter-api.md)
- [Tool Playbooks](./ai-tool-playbooks.md)
- [Generator Consumption](./generator-consumption.md)
