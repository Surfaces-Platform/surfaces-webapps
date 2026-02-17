# Shell Ownership Boundary for Generators

This page explains how contract fields encode the layout boundary between shell-owned primitives and surface-owned content, and how generators must enforce it across tools (Figma Make, Lovable/LLM builders, agentic coders).

Related adapter docs:

- [AI Generator Adapter Quick Start](./ai-generator-adapter-quickstart.md)
- [AI Generator Adapter API](./ai-generator-adapter-api.md)
- [AI Tool Playbooks](./ai-tool-playbooks.md)

## Contract fields

- `shell.owns` (array): Shell-owned primitives (e.g., `nav`, `header`, `sidebar`, `authWrapper`, `appChrome`). Generators must not emit these inside surfaces.
- `shell.contentSlot` (string): Identifier for the shell’s content mount point (frame name or DOM id).
- `surface.mustNotEmit` (array, per-surface): Optional explicit ban list. If absent, treat it as `shell.owns`.

Example fragment:
```json
{
  "version": "1.3.0",
  "shell": {
    "owns": ["nav", "header", "authWrapper"],
    "contentSlot": "content"
  },
  "surfaces": [
    {
      "id": "marketing-home",
      "displayName": "Marketing Home",
      "type": "web",
      "requiredSections": ["main.hero"],
      "allowedFonts": ["Inter"],
      "layout": { "maxContentWidth": 1200 },
      "mustNotEmit": ["nav", "header", "authWrapper"]
    }
  ],
  "sections": [...],
  "constraints": {...}
}
```

Defaults and compatibility:
- If `surface.mustNotEmit` is missing, generators should default it to `shell.owns` when `shell` is present.
- `shell` is optional; legacy contracts remain valid.

## Enforcement patterns by generator

### Figma Make
- Lock frames/components whose names/roles match `shell.owns`.
- Expose only the `contentSlot` frame for editing and export.
- Preflight script/plugin rejects added frames matching the ban list.

### Lovable / LLM UI builders
- Include `mustNotEmit` in the system prompt and scaffold a fixed shell wrapper with a single content slot.
- Post-generation structural lint rejects outputs containing banned primitives before returning artifacts; auto-regenerate once, then fail.

### Agentic coder / template engines
- Read `shell` and `mustNotEmit` before generation; wrap output with the shell layout.
- Block imports/components whose identifiers match the ban list.
- Snapshot test surfaces mounted inside a mocked shell to ensure only one nav/header/auth wrapper appears.

## Why this matters
The double-navigation incident came from re-emitting a shell-owned primitive inside a surface. Encoding the boundary in the contract and enforcing it at generation time makes that failure mode impossible without bloating the contract.

## See also
- `generator-consumption.md` for broader generator rules
- Schema source: `interfacectl/packages/interfacectl-validator/src/schema/web.surface.contract.schema.json`
- Contract baseline: `interfacectl/docs/contract-baseline.md`
