# Generator-Aware Contract Consumption

This document defines how code generators (AI tools, scaffolding utilities, template engines) should consume Surfaces interface contracts to produce compliant output.

## Contract Subset for Generators

Generators should focus on the following contract sections that define correctness constraints:

### Shell Ownership Boundary (new)

- **`shell.owns`**: Shell-owned primitives (e.g., `nav`, `header`, `sidebar`, `authWrapper`, `appChrome`). Generators **must not emit** these inside surfaces.
- **`shell.contentSlot`**: Identifier for the shell’s content mount point (frame name or DOM id).
- **`surface.mustNotEmit`**: Optional per-surface ban list. If absent, default to `shell.owns`.

Generator enforcement patterns:
- **Figma Make**: Lock frames matching `shell.owns`; expose only the `contentSlot` frame for editing/export. Preflight blocks added frames whose names/roles match the ban list.
- **Lovable / LLM UI builders**: Include `mustNotEmit` in system prompt + scaffold; run post-gen structural lint to reject banned primitives before returning artifacts.
- **Agentic coder / template engines**: Read `shell` + `mustNotEmit` before generation; block imports/components that match the ban list; snapshot test surfaces mounted in a mocked shell to ensure single nav/header.

### Layout Invariants

- **`surfaces[].layout.maxContentWidth`**: Maximum content width in pixels (enforced via static analysis)
- **`surfaces[].layout.requiredContainers`**: Required container selectors (defaults to `["contract-container"]` if omitted)

### Color Source of Truth

- **`color.sourceOfTruth.type`**: `"tokens"` or `"none"` - Whether colors must come from tokens
- **`color.sourceOfTruth.tokenNamespaces`**: Allowed CSS variable namespace prefixes (e.g., `["--color-", "--background"]`)

### Color Raw Value Policy

- **`color.rawValues.policy`**: `"off"` | `"warn"` | `"strict"` - How raw color literals are handled
- **`color.rawValues.allowlist`**: Explicitly allowed raw color values (hex, rgb, hsl)
- **`color.rawValues.denylist`**: Explicitly forbidden raw color values

### Motion Constraints

- **`constraints.motion.allowedDurationsMs`**: Valid animation/transition durations in milliseconds
- **`constraints.motion.allowedTimingFunctions`**: Valid timing function names

## Interpretation Rules

Generators must interpret policy levels consistently:

### Policy Interpretation

- **`policy: "strict"`** → Hard constraint: Generators **must** enforce the rule. Generated code that violates strict policies will fail validation.
- **`policy: "warn"`** → Soft preference: Generators **should** surface warnings but violations are non-blocking. Use for guidance during generation.
- **`policy: "off"`** → Ignore: No validation is performed. Generators may treat this as informational only.

### Conflict Resolution

- **Denylist overrides allowlist**: If a value appears in both, denylist takes precedence
- **Strict overrides warn**: If multiple policies apply, strict is enforced
- **Most specific rule wins**: Surface-level overrides apply over contract-level defaults

## Provenance Requirements

**Note:** This milestone documents provenance requirements but does not yet enforce them. This avoids prematurely constraining generation workflows.

Generated output should include metadata indicating:

- **Surface ID**: Which surface the code targets (from `surfaces[].id`)
- **Contract version**: Contract version used for generation (from `version`)
- **Contract ID**: Contract identifier (from `contractId`)

### Embedding Provenance

Generators should embed this metadata in generated code via:

- **HTML comments**: `<!-- Generated for surface: surfaces-web, contract: surfaces.web@0.1.0 -->`
- **Data attributes**: `<html data-contract="surfaces.web" data-surface="surfaces-web" data-version="0.1.0">`
- **JavaScript comments**: `// Generated from surfaces.web@0.1.0 for surfaces-web`
- **CSS comments**: `/* Generated from surfaces.web@0.1.0 for surfaces-web */`

## Validation

Generated UI is validated **exactly the same way as human-written UI** via `pnpm validate:ci`.

### No Special Casing

- Generated code must pass the same validation rules as hand-written code
- No different validation paths or exceptions for generated content
- Violations attribute to the generator's surface without ambiguity

### Validation Workflow

1. Generator produces output conforming to contract rules
2. Generated code is committed to the surface repository
3. `pnpm validate:ci` runs the same static analysis on generated and human-written code
4. Violations are reported with location metadata (file, line, property)
5. Generator or developer fixes violations following remediation guidance

## Example Generator Flow

```typescript
// Pseudo-code example
const contract = loadContract("contracts/surfaces.web.contract.json");
const surface = contract.surfaces.find(s => s.id === "surfaces-web");

// Enforce strict policies
if (surface.layout.maxContentWidth) {
  // Generator must respect maxContentWidth
  generateLayoutContainer(surface.layout.maxContentWidth);
}

// Respect color token namespaces
if (contract.color?.sourceOfTruth?.type === "tokens") {
  const namespaces = contract.color.sourceOfTruth.tokenNamespaces;
  // Generator must use tokens from allowed namespaces
  generateColorTokens(namespaces);
}

// Honor raw value policy
if (contract.color?.rawValues?.policy === "strict") {
  // Generator must not use raw color literals
  // Must use tokens from allowed namespaces
}

// Embed provenance
generateHTML({
  contractId: contract.contractId,
  version: contract.version,
  surfaceId: surface.id,
});
```

## Reference adapter snippets (ready to copy)

Cursor / Lovable (Node/TS):
```typescript
import contract from "../contracts/surfaces.web.contract.json";

export function applyContract(surfaceId: string, css: string) {
  const surface = contract.surfaces.find(s => s.id === surfaceId);
  if (!surface) throw new Error(`Unknown surface ${surfaceId}`);
  const violations: Array<{rule: string; policy: string; evidence: any}> = [];

  // raw color check
  const policy = contract.color?.rawValues?.policy ?? "off";
  if (policy !== "off" && /(rgb|hsl)a?\\(/i.test(css)) {
    violations.push({ rule: "color.rawValues", policy, evidence: { value: "raw literal in CSS" } });
  }

  const strictHit = violations.some(v => v.policy === "strict");
  return {
    allowed: !strictHit,
    provenance: { surfaceId, contractId: contract.contractId, version: contract.version },
    violations
  };
}
```

Figma plugin scaffold (manifest-driven):
```javascript
import contract from "../contracts/surfaces.web.contract.json";

function validateNode(node) {
  const policy = contract.color.rawValues.policy;
  if (policy !== "off" && node.fills?.some(fill => fill.type === "SOLID" && fill.opacity < 1)) {
    return [{ rule: "color.rawValues", policy, evidence: { nodeId: node.id } }];
  }
  return [];
}
```

Make / template engines (provenance injection):
```handlebars
<!doctype html>
<html data-contract="{{contractId}}" data-surface="{{surfaceId}}" data-version="{{version}}">
  <body class="contract-container">
    {{!-- generator must ensure required containers and token usage --}}
  </body>
</html>
```

## Future Extensions

Additional correctness dimensions will reuse the same policy + maturity pattern:

- **Accessibility**: `accessibility.policy`, `accessibility.rules`
- **Interaction constraints**: `interactions.policy`, `interactions.allowedPatterns`
- **State transitions**: `state.policy`, `state.allowedTransitions`

Generators should anticipate this extensibility when implementing contract consumption.
