# AI Tool Playbooks

This guide applies one generation adapter contract across Codex, Cursor, Lovable, and Figma Make.

## Shared model

All tools consume the same adapter verdict contract:

- `pass`
- `warn`
- `block`

Canonical policy source remains:

- `contracts/surfaces.web.contract.json`

Descriptor parity rollout source:

- `contracts/generation-descriptor-parity.json`

## Codex playbook

1. Generate or edit UI in repo.
2. Run adapter CLI in `workspace` mode.
3. If `block`, regenerate/fix based on findings.
4. If `warn`, continue with warning visibility.
5. Before merge, run CI hard gate with full validate.

## Cursor playbook

1. Generate UI with Cursor.
2. Trigger adapter CLI via a task/command.
3. Feed findings JSON back into assistant context.
4. Treat `block` as a stop condition.
5. Keep CI hard gate enabled.

## Lovable playbook

1. Transform generated output to descriptor payload.
2. Send payload to `POST /surfaces.validateGeneration`.
3. Show findings and status before publish (include `icons[]` in descriptors).
4. If host cannot hard-disable publish, require CI fallback.
5. Promote only after CI passes.

## Figma Make playbook

1. Map generated nodes/styles into descriptor primitives/colors/icons.
2. Submit descriptor to HTTP adapter endpoint.
3. Gate export/promotion on adapter status.
4. Surface findings with code/policy/evidence.
5. Use CI fallback when hard block is unavailable.

## Rollout note

- Descriptor parity checks for color/icon run only on surfaces listed in `contracts/generation-descriptor-parity.json` for this increment.
- Non-listed surfaces keep legacy descriptor behavior; CI/CD workspace validation remains the hard promotion gate.

## CI hard gate fallback

For hosted tools without guaranteed in-product blocking:

```bash
pnpm run adapter:validate-generation -- \
  --tool codex \
  --surface reference-target-web \
  --mode workspace \
  --workspace-root /absolute/path/to/workspace \
  --contract /absolute/path/to/contracts/surfaces.web.contract.json
```

Fail promotion on exit code `30`.

## Related docs

- [Quick Start](./ai-generator-adapter-quickstart.md)
- [Adapter API](./ai-generator-adapter-api.md)
- [Shell Boundary](./shell-boundary.md)
