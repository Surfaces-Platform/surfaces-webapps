# Generated contracts (Phase 0)

Artifacts in this directory are produced by `interfacectl generate-contract` and committed for **traceability** and so CI can validate or compare without re-running the extractor. Regenerate with:

```bash
pnpm run generate:contract
```

Or from the interfacectl repo:

```bash
interfacectl generate-contract --app-root apps/surfaces-web --surface surfaces-web --out contracts/generated/surfaces-web.contract.json --report-out contracts/generated/surfaces-web.extraction.json
```

- `*.contract.json` — Schema-valid contract with `x_extracted` (routes, hasShell, designSystemComponents, authAware).
- `*.extraction.json` — Machine-readable report and warnings.
