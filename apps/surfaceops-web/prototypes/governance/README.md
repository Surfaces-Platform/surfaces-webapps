# Governance Prototypes

This directory stores versioned SurfaceOps governance workspace prototypes.

- `manifest.json` is the source of truth for prototype metadata and active selection.
- `p000N/` folders contain seed contract, extraction snapshot, and iteration notes.

Useful commands:

```bash
pnpm prototype:governance:new -- --title "..." --summary "..."
pnpm prototype:governance:snapshot
```

Inspector reference prompt:

- `docs/prompts/governance-inspector-v1.md`
