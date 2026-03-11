# Generated contracts (Phase 0)

Artifacts in this directory are produced by `interfacectl generate-contract` and committed for **traceability** and so CI can validate or compare without re-running the extractor. Regenerate all surfaces with:

```bash
pnpm run generate:contract:all
```

Or a single surface:

```bash
pnpm run generate:contract
```

The CLI is resolved through `scripts/interfacectl-tool.mjs` in this order: explicit env path, explicit repo root, detected sibling checkout, then installed package. The default path is a sibling standalone checkout. Run `pnpm run interfacectl:build` when the resolved source is a standalone or sibling checkout.

- `*.contract.json` — Schema-valid contract with `x_extracted` (routes, hasShell, designSystemComponents, authAware).
- `*.extraction.json` — Machine-readable report and warnings.
- `*.runtime-manifest.json` — Runtime edge manifest derived from canonical contract (`contractId`, `version`, `surfaceId`, `layout`, `color`, `motion`).
