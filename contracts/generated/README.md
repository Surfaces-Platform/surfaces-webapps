# Generated contracts (Phase 0)

Artifacts in this directory are produced by `interfacectl generate-contract` and committed for **traceability** and so CI can validate or compare without re-running the extractor. Regenerate all surfaces with:

```bash
pnpm run generate:contract:all
```

Or a single surface:

```bash
pnpm run generate:contract
```

The CLI is built from the `tools/interfacectl` submodule; run `pnpm run interfacectl:build` once if needed.

- `*.contract.json` — Schema-valid contract with `x_extracted` (routes, hasShell, designSystemComponents, authAware).
- `*.extraction.json` — Machine-readable report and warnings.
