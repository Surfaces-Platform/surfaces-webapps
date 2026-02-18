# Interface Contract Validation

## Canonical contract

- **Source of truth**: [`contracts/surfaces.web.contract.json`](../../contracts/surfaces.web.contract.json)
- **Schema**: [`tools/interfacectl/packages/interfacectl-validator/src/schema/web.surface.contract.schema.json`](../../tools/interfacectl/packages/interfacectl-validator/src/schema/web.surface.contract.schema.json)
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

The CLI is available in the workspace via `@surfaces/interfacectl-cli`. Run validation from the Surfaces monorepo root:

```bash
# Local development (assumes CLI packages are built)
pnpm validate:local

# CI/production (builds CLI from source, then validates)
pnpm validate:ci

# Direct usage (if CLI is built)
pnpm exec interfacectl validate --workspace-root . --contract contracts/surfaces.web.contract.json
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

## Web icon source policy visibility

Icon-source findings are lifecycle-specific in this increment. Use the phase terms from `docs/taxonomy.md` and treat `CI/CD time` workspace validation as authoritative.

### Lifecycle matrix

| Lifecycle phase | Current behavior |
|---|---|
| `Generation time` | Descriptor-mode adapter checks are visibility-oriented and do not currently enforce icon-source policy. |
| `CI/CD time` | Workspace-mode adapter and `interfacectl validate` are authoritative for icon-source findings (`icon.source-disallowed`). |
| `Runtime (edge)` | Icon-source policy is not enforced at runtime in this increment. |

### Visibility and outcomes

- `icon.source-disallowed` appears in validate findings when icon policy is configured and a disallowed source is detected.
- Policy `warn` keeps status non-blocking (`warn`).
- Policy `strict` yields blocking status (`block` in adapter wrappers, exit `30` with `--exit-codes v2`).

Minimal finding sample:

```json
{
  "code": "icon.source-disallowed",
  "severity": "warning",
  "surface": "surfaces-web",
  "message": "Icon source is not allowed by contract policy."
}
```

### Commands (repo root)

```bash
# Workspace-mode adapter check (CI/CD-time authoritative path)
pnpm run adapter:validate-generation -- --tool codex --surface surfaces-web --mode workspace --workspace-root . --contract ./contracts/surfaces.web.contract.json

# Direct CLI validate with deterministic v2 exit codes
node tools/interfacectl/packages/interfacectl-cli/dist/index.js validate --workspace-root . --contract ./contracts/surfaces.web.contract.json --format json --exit-codes v2
```

### Prerequisites

- `tools/interfacectl` must be on an icon-policy-capable revision.
- Contract must define per-surface icon policy blocks (`surfaces[*].icons`) for icon-source checks to emit findings.

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

### Turnkey CI templates

GitHub Actions (copy-paste):
```yaml
name: interface-contract
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec interfacectl validate --root . --contract contracts/surfaces.web.contract.json --format json --out ./artifacts/interfacectl-report.json
      - uses: actions/upload-artifact@v4
        with:
          name: interfacectl-report
          path: artifacts/interfacectl-report.json
```

GitLab CI (copy-paste):
```yaml
interface_contract:
  image: node:20
  stage: test
  script:
    - corepack enable
    - pnpm install --frozen-lockfile
    - pnpm exec interfacectl validate --root . --contract contracts/surfaces.web.contract.json --format json --out interfacectl-report.json
  artifacts:
    paths:
      - interfacectl-report.json
  allow_failure: false
```

### Exit-code & troubleshooting matrix

| Exit code | Meaning | Usual fixes |
|-----------|---------|-------------|
| 0 | Success | — |
| 1 | Violations found | Follow file/line in output; fix raw colors, missing containers, motion duration mismatch, etc. |
| 2 | Config/IO error | Check `--root`, `--contract`, `interfacectl.config.json` path, missing files, JSON parse errors. |
| >2 | Unexpected error | Ensure CLI built/installed; rerun with `--format json`; open an issue with report payload. |

Tips: keep `interfacectl.config.json` in repo root; pin Node 18/20; add `--surface <id>` for narrow runs; store JSON artifact so SurfaceOps (future) can ingest it.

## Surface authoring checklist

1. Wrap top-level content in `.contract-container` and honour `--contract-max-width`.
2. Annotate sections with `data-contract-section="surface.section"`.
3. Reference shared font variables in `layout.tsx` / CSS; avoid ad-hoc font stacks.
4. Reuse `.contract-motion` (or equivalent) transitions defined via contract motion variables.
5. After installing the CLI (`pnpm add -D @surfaces/interfacectl-cli`), run `pnpm exec interfacectl validate --root . --contract contracts/surfaces.web.contract.json` locally before opening a PR.

## Pre-commit Hooks

A pre-commit hook is configured to automatically run contract validation before each commit. This prevents contract violations from being committed.

**Setup**: The pre-commit hook automatically runs `pnpm validate:local` before each commit. This uses the workspace-linked CLI, which must be built first. If you encounter build errors, run:

```bash
# Build the CLI packages
pnpm --filter @surfaces/interfacectl-validator run build
pnpm --filter @surfaces/interfacectl-cli run build
```

The hook is managed via [husky](https://typicode.github.io/husky/) and configured in:
- `.husky/pre-commit` - Git hook script (runs `pnpm validate:local`)
- `package.json` - Contains the validation scripts and `prepare` script for husky initialization

**Bypassing the hook** (not recommended):
```bash
git commit --no-verify
```

Future enhancements (`init`, `diff`, `route`) can build on this foundation without changing the single source of truth.

## Contract Maturity Model

Surfaces uses a three-tier maturity model to gradually evolve interface correctness rules from informational to enforced. This allows teams to validate rules at low risk before making them blocking.

### Policy Levels

Rules are configured via policy fields that control how violations are handled:

- **`"off"`**: Defined but not evaluated - The rule exists in the contract but validation is disabled. Useful for documenting intent without enforcement.
- **`"warn"`**: Evaluated, non-blocking - Validation runs and violations emit warnings, but they do not block builds or deployments. Exit code allows warnings.
- **`"strict"`**: Evaluated, blocking - Validation runs and violations emit errors that block builds or deployments. Exit code fails on violations.

**Note:** In narrative text, `"off"` can be described as "informational" to convey that the rule is observed but not enforced. However, the technical definition must be clear: `"off"` means the rule is not evaluated at all, not that it's evaluated but never blocking.

### Current Policy Examples

The contract demonstrates each state:

- **Informational (`"off"`)**: Currently not demonstrated in contract, but available for future rules
- **Warning (`"warn"`)**: `surfaces[*].icons.policy: "warn"` - Disallowed icon sources are surfaced without blocking
- **Enforcement (`"strict"`)**: `color.policy: "strict"` - Non-allowlisted color values are blocking

### Graduation Criteria

Rules should progress through maturity levels when these conditions are met:

1. **False-positive rate acceptable** (< 5% suggested)
   - Rule correctly identifies violations without flagging legitimate code
   - Location metadata enables developers to verify findings quickly

2. **Location metadata available** (file, line, property)
   - Violations include exact file path, line number, and relevant property
   - Developers can fix violations without searching

3. **Clear remediation path exists**
   - Violations have obvious fixes (e.g., replace raw color with token)
   - Policy allows explicit allowlist/denylist when needed

4. **Team consensus on enforcement**
   - False positives are resolved
   - Developers trust the output
   - Migration path is documented

### Maturity Progression Example

A typical progression for a new rule:

1. **Define rule** (`policy: "off"`) - Document intent without enforcement
2. **Enable warnings** (`policy: "warn"`) - Surface violations without blocking
3. **Monitor and refine** - Collect feedback, fix false positives, refine allowlist/denylist
4. **Enable enforcement** (`policy: "strict"`) - Block violations when confidence is high

This model allows Surfaces to enforce correctness gradually, reducing risk while building developer trust in the validation system.
