# Interface Contract Validation

## Canonical contract

- **Source of truth**: [`contracts/surfaces.web.contract.json`](../../contracts/surfaces.web.contract.json)
- **Schema**: [`contracts/surfaces.web.contract.schema.json`](../../contracts/surfaces.web.contract.schema.json)
- **Guarantees**: surface enumerations, required section identifiers, allowed fonts, layout width, and motion constraints.

The contract is versioned JSON—surfaces must conform to it but never redefine it. All validation logic derives exclusively from this file (and optional schema).

## Validator toolkit

The shared validator now lives in the standalone `interfacectl` repository (`packages/interfacectl-validator`):

- JSON-schema verification (`validateContractStructure`)
- Contract vs surface compliance checks (`evaluateContractCompliance`)
- Types for contracts, descriptors, and violations

It remains framework-agnostic and operates on raw JSON inputs. The CLI consumes this package but you can use it directly from any Node environment if needed.

## Static surface descriptors

`interfacectl validate` generates descriptors via static analysis only:

- Sections: `data-contract-section` attributes discovered in `app/**/*.tsx`
- Fonts: `var(--font-*)` usage plus explicit `font-family` stacks in `layout.tsx` and CSS
- Layout: `--contract-max-width` variable defined in `app/globals.css` and `contract-container` usage
- Motion: `transition` / `transition-duration` declarations, constrained to `var(--contract-motion-duration)` and `var(--contract-motion-timing)`

No dev servers, app execution, or runtime introspection is invoked. If information cannot be resolved the CLI emits warnings and the validator will fail the check deterministically.

## CLI usage

Install the CLI from the standalone repo (once published to npm):

```bash
pnpm add -D @surfaces/interfacectl-cli
```

Then run the validator from the Surfaces monorepo root:

```bash
pnpm exec interfacectl validate --root . --contract contracts/surfaces.web.contract.json
```

The CLI will:

1. Load the contract (bundled schema is used automatically unless `--schema` is supplied)
2. Generate static descriptors for each contract surface from workspace files
3. Evaluate compliance using the validator library
4. Exit `0` on success, `1` on drift, `2` on contract/descriptor errors

### Flags

```
interfacectl validate [options]
```

- `--root <path>`: project root (defaults to `process.cwd()` or `SURFACES_ROOT`).
- `--contract <path>`: contract JSON (defaults to `contracts/surfaces.web.contract.json` or `SURFACES_CONTRACT`).
- `--schema <path>`: optional schema override; bundled schema is used when omitted.
- `--surface <id...>`: filter validation to the provided surfaces.
- `--format <text|json>`: output format (`text` by default).
- `--out <path>`: write output to a file (otherwise stdout is used).

Environment fallbacks:

- `SURFACES_ROOT` behaves like `--root`.
- `SURFACES_CONTRACT` behaves like `--contract`.

### Configuration

- The CLI reads `interfacectl.config.json` (relative to `--root`) to map contract surface IDs to descriptor roots.
- File format:

```json
{
  "surfaceRoots": {
    "interfacectl-web": "apps/interfacectl-web"
  }
}
```

- Override the config path with `--config` or the `SURFACES_CONFIG` environment variable.

### Output

- ✅ success: summary per surface
- ⚠ warnings: non-blocking extraction issues (e.g. missing motion data)
- ✖ violations: drift details with actionable metadata
- Stable exit codes (0 success, 1 violations, 2 configuration/IO errors)

## CI integration

Add the validation step to CI pipelines after installing the CLI dependency. Example GitHub Actions workflow:

```yaml
name: Interface Contract

on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate-interface:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec interfacectl validate --root . --contract contracts/surfaces.web.contract.json --format json
```

Failures produce deterministic CLI output with remediation guidance; block the merge until resolved.

## Surface authoring checklist

1. Wrap top-level content in `.contract-container` and honour `--contract-max-width`.
2. Annotate sections with `data-contract-section="surface.section"`.
3. Reference shared font variables in `layout.tsx` / CSS; avoid ad-hoc font stacks.
4. Reuse `.contract-motion` (or equivalent) transitions defined via contract motion variables.
5. After installing the CLI (`pnpm add -D @surfaces/interfacectl-cli`), run `pnpm exec interfacectl validate --root . --contract contracts/surfaces.web.contract.json` locally before opening a PR.

Future enhancements (`init`, `diff`, `route`) can build on this foundation without changing the single source of truth.


