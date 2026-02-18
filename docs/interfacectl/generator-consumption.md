# Generator-Aware Contract Consumption

This document defines how code generators (AI tools, scaffolding utilities, template engines) should consume Surfaces interface contracts to produce compliant output.

Related adapter docs:

- [AI Generator Adapter Quick Start](./ai-generator-adapter-quickstart.md)
- [AI Generator Adapter API](./ai-generator-adapter-api.md)
- [AI Tool Playbooks](./ai-tool-playbooks.md)

## Contract Subset for Generators

Generators should consume the contract fields that define correctness constraints.

### Shell Ownership Boundary

- **`shell.owns`**: Shell-owned primitives (for example `nav`, `header`, `sidebar`, `authWrapper`, `appChrome`).
- **`shell.contentSlot`**: Identifier for the shell content mount point.
- **`surface.mustNotEmit`**: Optional per-surface ban list. If absent, default to `shell.owns`.

Generator enforcement patterns:
- **Figma Make**: lock shell-owned frames; expose only content slot.
- **Lovable/LLM builders**: include `mustNotEmit` in prompts and reject banned primitives post-generation.
- **Agentic coders/template engines**: block banned imports/components before output.

### Layout Invariants

- **`surfaces[].layout.maxContentWidth`**: maximum content width in pixels.
- **`surfaces[].layout.requiredContainers`**: required container selectors (defaults to `contract-container` when omitted).

### Unified Color Policy

- **`color.policy`**: `"off" | "warn" | "strict"`.
- **`color.allowedValues`**: exact allowlist of canonical color values.

Interpretation:
- `off`: do not evaluate color values.
- `warn`: report non-allowlisted colors as warnings.
- `strict`: report non-allowlisted colors as blocking errors.

### Per-Surface Icon Source Policy

- **`surfaces[].icons.policy`**: `"off" | "warn" | "strict"`.
- **`surfaces[].icons.allowedSources`**: allowlist of import sources (for example `@heroicons/react/24/outline`, `lucide-react`).

Interpretation:
- `off`: do not evaluate icon sources.
- `warn`: report disallowed icon sources as warnings.
- `strict`: report disallowed icon sources as blocking errors.

### Motion Constraints

- **`constraints.motion.allowedDurationsMs`**: allowed transition/animation durations.
- **`constraints.motion.allowedTimingFunctions`**: allowed timing function names.

## Policy Interpretation Rules

- **`strict`**: hard constraint, block generation output that violates it.
- **`warn`**: soft constraint, surface the finding but allow continuation.
- **`off`**: informational/no evaluation.

Conflict handling:
- Most specific surface rule wins over broader defaults.
- If any finding is strict/error, adapter status is `block`.

## Provenance Requirements

Generated output should carry:
- `surfaceId`
- `contractId`
- `contract version`

Embedding patterns:
- HTML comments: `<!-- Generated for surfaces-web from surfaces.web@0.1.0 -->`
- Data attributes: `data-contract`, `data-surface`, `data-version`
- Source comments in generated TS/CSS files.

## Validation

Generated UI is validated through the same path as human-authored UI:

1. Generate output from contract.
2. Run `pnpm validate:ci` (or adapter workspace mode).
3. Fix findings using emitted file/location metadata.

No alternate rule path exists for generated content.

## Example Generator Flow

```typescript
const contract = loadContract("contracts/surfaces.web.contract.json");
const surface = contract.surfaces.find((s) => s.id === "surfaces-web");
if (!surface) throw new Error("Unknown surface");

// Respect layout invariants.
generateLayoutContainer(surface.layout.maxContentWidth);

// Enforce unified color policy.
const colorPolicy = contract.color.policy;
if (colorPolicy !== "off") {
  validateColorsAgainstAllowlist(contract.color.allowedValues);
}

// Enforce icon source policy when configured on a surface.
if (surface.icons && surface.icons.policy !== "off") {
  validateIconImports(surface.icons.allowedSources, surface.icons.policy);
}

embedProvenance({
  surfaceId: surface.id,
  contractId: contract.contractId,
  version: contract.version,
});
```

## Reference Adapter Snippets

Cursor / Lovable (Node/TS):
```typescript
import contract from "../contracts/surfaces.web.contract.json";

export function applyContract(surfaceId: string, css: string, iconImports: string[]) {
  const surface = contract.surfaces.find((s) => s.id === surfaceId);
  if (!surface) throw new Error(`Unknown surface ${surfaceId}`);

  const violations: Array<{ rule: string; policy: string; evidence: any }> = [];

  if (contract.color.policy !== "off") {
    const allowed = new Set(contract.color.allowedValues);
    const rawColors = extractRawColors(css);
    for (const color of rawColors) {
      if (!allowed.has(color)) {
        violations.push({ rule: "color.disallowed", policy: contract.color.policy, evidence: { value: color } });
      }
    }
  }

  if (surface.icons && surface.icons.policy !== "off") {
    const allowedIcons = new Set(surface.icons.allowedSources);
    for (const source of iconImports) {
      if (!allowedIcons.has(source)) {
        violations.push({ rule: "icon.source-disallowed", policy: surface.icons.policy, evidence: { source } });
      }
    }
  }

  const strictHit = violations.some((v) => v.policy === "strict");
  return {
    allowed: !strictHit,
    provenance: { surfaceId, contractId: contract.contractId, version: contract.version },
    violations,
  };
}
```

Figma plugin scaffold:
```javascript
import contract from "../contracts/surfaces.web.contract.json";

function validateNode(node, surfaceId) {
  const surface = contract.surfaces.find((s) => s.id === surfaceId);
  if (!surface) return [];

  const violations = [];
  const policy = contract.color.policy;
  if (policy !== "off" && node.fills?.some((fill) => fill.type === "SOLID")) {
    const value = toCssColor(node.fills[0]);
    if (!contract.color.allowedValues.includes(value)) {
      violations.push({ rule: "color.disallowed", policy, evidence: { nodeId: node.id, value } });
    }
  }
  return violations;
}
```

Template engines (provenance injection):
```handlebars
<!doctype html>
<html data-contract="{{contractId}}" data-surface="{{surfaceId}}" data-version="{{version}}">
  <body class="contract-container">
    {{!-- generator must satisfy layout/section/color/icon constraints --}}
  </body>
</html>
```

## Future Extensions

Additional correctness dimensions should reuse the same policy model (`off|warn|strict`) and deterministic findings contract.
