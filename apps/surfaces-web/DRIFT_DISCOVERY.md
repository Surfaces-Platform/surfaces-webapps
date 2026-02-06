# Drift Discovery Report

## Contract Intent Declaration

**Contract File:** `surfaces.interface.contract.json`  
**Created:** Intent declaration for Page Frame layout rules  
**Status:** DRIFT DISCOVERED

## Intent Declared

The contract declares intended Page Frame behavior:

```json
{
  "layout": {
    "maxContentWidth": 1120,
    "pageFrame": {
      "containerSelector": "[data-contract='page-container']",
      "containerMaxWidthPx": 1120,
      "paddingXpx": 24,
      "alignment": "center",
      "enforcement": "strict"
    }
  }
}
```

## Validation Results

### Schema Validation Failure

The contract structure validation failed with the following errors:

1. **Schema Error:** `layout.pageFrame` is not supported in the current contract schema
   - The validator's bundled schema does not include `pageFrame` as a valid property in `layout`
   - Current schema only supports: `maxContentWidth` and `requiredContainers` (optional)

2. **Schema Error:** `allowedColors` validation issue
   - Additional validation issue detected (may be schema version mismatch)

### Validation Output (JSON)

```json
{
  "contractPath": "/Users/mike/Cursor/surfaces-monorepo/apps/surfaces-web/surfaces.interface.contract.json",
  "contractVersion": "0.1.0",
  "summary": {
    "errors": 2,
    "warnings": 0
  },
  "findings": [
    {
      "code": "contract.schema-error",
      "severity": "error",
      "message": "/surfaces/0/layout: must NOT have additional properties ({\"additionalProperty\":\"pageFrame\"})"
    },
    {
      "code": "contract.schema-error",
      "severity": "error",
      "message": "/surfaces/0: must NOT have additional properties ({\"additionalProperty\":\"allowedColors\"})"
    }
  ]
}
```

## Implementation Status

### DOM Instrumentation

✅ **Completed:** Added `data-contract="page-container"` to the main page container element  
**Location:** `app/page.tsx` line 43

```tsx
<div className="contract-container" data-contract="page-container">
```

### Current Implementation vs Intent

**Intent (Contract):**
- Container selector: `[data-contract='page-container']`
- Max width: 1120px
- Horizontal padding: 24px (fixed)
- Alignment: center
- Enforcement: strict

**Current Implementation (CSS):**
- Container class: `.contract-container`
- Max width: 1120px ✅ (matches intent)
- Horizontal padding: `clamp(1.5rem, 3vw, 3.5rem)` ❌ (responsive, not fixed 24px)
- Alignment: center ✅ (margin: 0 auto)
- Enforcement: N/A (not validated yet)

## Discovered Drift

### Drift Type 1: Contract Schema Capability Gap
- **Issue:** Contract declares `layout.pageFrame` intent, but validator schema doesn't support it
- **Impact:** Cannot validate Page Frame rules against implementation
- **Status:** Validator needs schema update to support Page Frame contracts

### Drift Type 2: Implementation vs Intent (Pending Validation)
- **Issue:** Once Page Frame validation is supported, the padding mismatch will be detected
- **Current State:** 
  - Intent: Fixed 24px padding
  - Implementation: Responsive `clamp(1.5rem, 3vw, 3.5rem)`
- **Status:** Requires validator support for Page Frame rules to be detected

## Next Steps (Explicitly Out of Scope for This Phase)

- ❌ Do NOT fix layout issues
- ❌ Do NOT update validator schema  
- ❌ Do NOT modify CSS to match contract

This is an INTENT DECLARATION and DRIFT DISCOVERY phase only.

## Artifacts

1. ✅ Contract file: `surfaces.interface.contract.json`
2. ✅ DOM marker: `data-contract="page-container"` added
3. ✅ Validation output captured (shows schema limitations)
4. ✅ Drift documented

---

**Phase:** Intent Declaration & Drift Discovery  
**Date:** Validation executed  
**Outcome:** Drift discovered between declared intent and validator capabilities

---

## Surface Compliance Drift

### Validation Run 1: Local Workspace CLI

**Date/Time:** 2026-01-15 04:41:07 UTC  
**Repository:** surfaces-monorepo  
**Mode:** local (workspace)  
**CLI Version:** 0.1.0  
**CLI Binary:** `./node_modules/.bin/interfacectl`  
**Command:** `pnpm validate:local --format json`

**Contract Validated:** `contracts/surfaces.web.contract.json`

**Summary:**
- **Errors:** 3
- **Warnings:** 0
- **Status:** FAILED - Schema validation errors

**Violations:**

| Code | Severity | Message |
|------|----------|---------|
| `contract.schema-error` | error | `/surfaces/0: must NOT have additional properties ({"additionalProperty":"allowedColors"})` |
| `contract.schema-error` | error | `/surfaces/1: must NOT have additional properties ({"additionalProperty":"allowedColors"})` |
| `contract.schema-error` | error | `/surfaces/2: must NOT have additional properties ({"additionalProperty":"allowedColors"})` |

**Raw Output (JSON):**
```json
{
  "contractPath": "/Users/mike/Cursor/surfaces-monorepo/contracts/surfaces.web.contract.json",
  "contractVersion": "0.1.0",
  "summary": {
    "errors": 3,
    "warnings": 0
  },
  "findings": [
    {
      "code": "contract.schema-error",
      "severity": "error",
      "message": "/surfaces/0: must NOT have additional properties ({\"additionalProperty\":\"allowedColors\"})"
    },
    {
      "code": "contract.schema-error",
      "severity": "error",
      "message": "/surfaces/1: must NOT have additional properties ({\"additionalProperty\":\"allowedColors\"})"
    },
    {
      "code": "contract.schema-error",
      "severity": "error",
      "message": "/surfaces/2: must NOT have additional properties ({\"additionalProperty\":\"allowedColors\"})"
    }
  ]
}
```

**Raw Output (Text):**
```
✖ Contract structure validation failed
  • /surfaces/0: must NOT have additional properties ({"additionalProperty":"allowedColors"})
  • /surfaces/1: must NOT have additional properties ({"additionalProperty":"allowedColors"})
  • /surfaces/2: must NOT have additional properties ({"additionalProperty":"allowedColors"})
```

**Next Action:** Tool capability gap - The validator schema does not recognize `allowedColors` as a valid property in surface definitions, despite it being present in the contract file. This indicates a schema version mismatch or missing schema definition.

---

### Validation Run 2: Local Workspace CLI (Page Frame Contract)

**Date/Time:** 2026-01-15 04:41:07 UTC  
**Repository:** surfaces-monorepo  
**Mode:** local (workspace)  
**CLI Version:** 0.1.0  
**CLI Binary:** `./node_modules/.bin/interfacectl`  
**Command:** `pnpm validate:local --contract ./apps/surfaces-web/surfaces.interface.contract.json --format json`

**Contract Validated:** `apps/surfaces-web/surfaces.interface.contract.json`

**Summary:**
- **Errors:** 2
- **Warnings:** 0
- **Status:** FAILED - Schema validation errors

**Violations:**

| Code | Severity | Message |
|------|----------|---------|
| `contract.schema-error` | error | `/surfaces/0: must NOT have additional properties ({"additionalProperty":"allowedColors"})` |
| `contract.schema-error` | error | `/surfaces/0/layout: must NOT have additional properties ({"additionalProperty":"pageFrame"})` |

**Raw Output (JSON):**
```json
{
  "contractPath": "/Users/mike/Cursor/surfaces-monorepo/apps/surfaces-web/surfaces.interface.contract.json",
  "contractVersion": "0.1.0",
  "summary": {
    "errors": 2,
    "warnings": 0
  },
  "findings": [
    {
      "code": "contract.schema-error",
      "severity": "error",
      "message": "/surfaces/0: must NOT have additional properties ({\"additionalProperty\":\"allowedColors\"})"
    },
    {
      "code": "contract.schema-error",
      "severity": "error",
      "message": "/surfaces/0/layout: must NOT have additional properties ({\"additionalProperty\":\"pageFrame\"})"
    }
  ]
}
```

**Next Action:** Tool capability gap - The validator schema does not support:
1. `allowedColors` property in surface definitions
2. `pageFrame` property in layout definitions

The contract declares intent for Page Frame validation, but the validator cannot process it due to schema limitations.

---

### Validation Run 3: Production Registry CLI

**Date/Time:** 2026-01-15 04:41:07 UTC  
**Repository:** surfaces-monorepo  
**Mode:** prod (registry@latest)  
**Command:** `pnpm validate:prod --format json`

**Contract Validated:** `contracts/surfaces.web.contract.json`

**Summary:**
- **Status:** FAILED - Package not published
- **Error:** `@surfaces/interfacectl-cli` is not available in the npm registry

**Raw Output:**
```
ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/@surfaces%2Finterfacectl-cli: Not Found - 404

@surfaces/interfacectl-cli is not in the npm registry, or you have no permission to fetch it.
```

**Next Action:** Package publication required - The `@surfaces/interfacectl-cli` package must be published to npm before `validate:prod` can execute. This is expected behavior for a package that has not yet been published.

---

## Summary of Surface Compliance Drift

### Contract Schema Mismatches

1. **`allowedColors` Property:**
   - **Expected:** Valid property in surface definitions (present in contract)
   - **Actual:** Schema rejects `allowedColors` as an additional property
   - **Impact:** All three surfaces (interfacectl-web, surfaceops-web, surfaces-web) fail validation
   - **Type:** Tool capability gap

2. **`pageFrame` Property:**
   - **Expected:** Valid property in layout definitions (declared in surfaces.interface.contract.json)
   - **Actual:** Schema rejects `pageFrame` as an additional property
   - **Impact:** Page Frame contract cannot be validated
   - **Type:** Tool capability gap

### Registry Availability

- **Status:** `@surfaces/interfacectl-cli@latest` is not published to npm registry
- **Impact:** Production validation mode cannot execute until package is published
- **Type:** Deployment prerequisite

### Validation Execution

- ✅ **Local mode:** Executes deterministically using workspace CLI (v0.1.0)
- ❌ **Prod mode:** Cannot execute (package not published)
- ✅ **Dual-resolution strategy:** Successfully implemented and functional for local development

---

## Post-schema-fix Validation Run

### Validation Run: Repo-built CI/Prod Strategy

**Date/Time:** 2026-01-15 04:58:33 UTC  
**Repository:** surfaces-monorepo  
**Mode:** CI/Prod (repo-built from source)  
**Command:** `pnpm validate:ci --format json`

**Provenance:**
- **CLI Version:** 0.1.0
- **Binary:** `./node_modules/.bin/interfacectl`
- **Build Status:** CLI packages built from source
- **Git SHA:** 00257690b2b5eb6cff9697d78b0fa5463826f9c7

**Contract Validated:** `contracts/surfaces.web.contract.json`

**Summary:**
- **Errors:** 3
- **Warnings:** 0
- **Status:** FAILED - Schema validation errors (capability gap)

**Violations:**

| Code | Severity | Classification | Message |
|------|----------|----------------|---------|
| `contract.schema-error` | error | **Capability Gap** | `/surfaces/0: must NOT have additional properties ({"additionalProperty":"allowedColors"})` |
| `contract.schema-error` | error | **Capability Gap** | `/surfaces/1: must NOT have additional properties ({"additionalProperty":"allowedColors"})` |
| `contract.schema-error` | error | **Capability Gap** | `/surfaces/2: must NOT have additional properties ({"additionalProperty":"allowedColors"})` |

**Raw Output (JSON):**
```json
{
  "contractPath": "/Users/mike/Cursor/surfaces-monorepo/contracts/surfaces.web.contract.json",
  "contractVersion": "0.1.0",
  "summary": {
    "errors": 3,
    "warnings": 0
  },
  "findings": [
    {
      "code": "contract.schema-error",
      "severity": "error",
      "message": "/surfaces/0: must NOT have additional properties ({\"additionalProperty\":\"allowedColors\"})"
    },
    {
      "code": "contract.schema-error",
      "severity": "error",
      "message": "/surfaces/1: must NOT have additional properties ({\"additionalProperty\":\"allowedColors\"})"
    },
    {
      "code": "contract.schema-error",
      "severity": "error",
      "message": "/surfaces/2: must NOT have additional properties ({\"additionalProperty\":\"allowedColors\"})"
    }
  ]
}
```

**Raw Output (Text):**
```
✖ Contract structure validation failed
  • /surfaces/0: must NOT have additional properties ({"additionalProperty":"allowedColors"})
  • /surfaces/1: must NOT have additional properties ({"additionalProperty":"allowedColors"})
  • /surfaces/2: must NOT have additional properties ({"additionalProperty":"allowedColors"})
```

### Analysis

**Failure Classification:** All failures are **Capability Gaps** (Type A)

The validator schema does not recognize `allowedColors` as a valid property in surface definitions. This prevents the contract from being accepted for validation, meaning no compliance checking can occur.

**Affected Surfaces:**
- `interfacectl-web` (surface 0)
- `surfaceops-web` (surface 1)
- `surfaces-web` (surface 2)

**Root Cause:**
The contract schema (`web.surface.contract.schema.json`) does not include `allowedColors` in the allowed properties for surface definitions, despite the contract file declaring this property for all three surfaces.

**Impact:**
- Contract structure validation fails before any compliance checking can occur
- No surface-level drift detection is possible until schema is updated
- All three surfaces are blocked from validation

**Next Action:** Tool capability gap - The validator schema must be updated to include `allowedColors` as a valid property in surface definitions before compliance validation can proceed.

---

**Phase:** Post-schema-fix Validation Run  
**Date:** 2026-01-15 04:58:33 UTC  
**Outcome:** Schema capability gap persists - `allowedColors` property not recognized by validator schema

---

## Schema Wiring Verification

### Validation Run: After Schema Update

**Date/Time:** 2026-01-15 05:40:24 UTC  
**Repository:** surfaces-monorepo  
**Mode:** CI/Prod (repo-built from source)  
**Command:** `pnpm validate:ci --format json`

**Provenance:**
- **CLI Version:** 0.1.0
- **Binary:** `./node_modules/.bin/interfacectl`
- **Binary Source:** `interfacectl-tooling/packages/interfacectl-cli`
- **Build Status:** CLI packages built from source
- **Git SHA:** 00257690b2b5eb6cff9697d78b0fa5463826f9c7

**Schema File Path:**
- **Resolved Schema:** `/Users/mike/Cursor/surfaces-monorepo/interfacectl-tooling/packages/interfacectl-validator/dist/schema/web.surface.contract.schema.json`
- **Source Schema:** `interfacectl-tooling/packages/interfacectl-validator/src/schema/web.surface.contract.schema.json`
- **Schema Loading:** Bundled via `getBundledContractSchema()` from `@surfaces/interfacectl-validator`

**Schema Verification:**
- **`allowedColors` in schema:** ✅ **TRUE** (found in schema file)
- **Schema source updated:** ✅ Updated from `contracts/web.surface.contract.schema.json`

**Contract Validated:** `contracts/surfaces.web.contract.json`

**Summary:**
- **Errors:** 0
- **Warnings:** 0
- **Status:** ✅ **PASSED** - All surfaces comply with the contract

**Validation Output (JSON):**
```json
{
  "contractPath": "/Users/mike/Cursor/surfaces-monorepo/contracts/surfaces.web.contract.json",
  "contractVersion": "0.1.0",
  "summary": {
    "errors": 0,
    "warnings": 0
  },
  "findings": []
}
```

**Validation Output (Text):**
```
✔ All surfaces comply with the contract
  • interfacectl-web ✅
  • surfaceops-web ✅
  • surfaces-web ✅
```

### Analysis

**Issue Identified:**
The validator's bundled schema (`interfacectl-tooling/packages/interfacectl-validator/src/schema/web.surface.contract.schema.json`) was missing the `allowedColors` property definition, even though the contract schema in `contracts/web.surface.contract.schema.json` contained it.

**Root Cause:**
The schema file in the validator package was out of sync with the contract schema. The validator bundles its own copy of the schema, which must be kept in sync with the source contract schema.

**Fix Applied:**
1. Copied updated schema from `contracts/web.surface.contract.schema.json` to `interfacectl-tooling/packages/interfacectl-validator/src/schema/web.surface.contract.schema.json`
2. Cleaned dist outputs for both validator and CLI packages
3. Rebuilt packages (validator → CLI)
4. Schema now includes `allowedColors` property definition

**Result:**
- ✅ Schema validation passes (no `contract.schema-error` for `allowedColors`)
- ✅ All three surfaces validate successfully
- ✅ Compliance checks now run (no surface-level drift detected)

**Note on Deprecation Warnings:**
The expected `contract.deprecated-field` warnings for `allowedColors` are not present. This suggests the deprecation logic has not yet been implemented in the validator code. The schema now accepts `allowedColors`, but deprecation warnings would require additional validator logic to detect and emit `deprecated-field` violations.

**Next Action:** Schema wiring is now correct. If deprecation warnings for `allowedColors` are desired, the validator code would need to be updated to detect deprecated fields and emit `contract.deprecated-field` violations instead of (or in addition to) accepting them.

---

**Phase:** Schema Wiring Verification  
**Date:** 2026-01-15 05:40:24 UTC  
**Outcome:** Schema updated and wired correctly - validation passes with 0 errors, 0 warnings

---

## Color policy dogfood enablement

**Phase:** Color Policy Implementation  
**Date:** 2026-01-15  
**Status:** ACTIVE - Warnings generated for migration and drift

### Provenance Stamp

This milestone validation was run with the following interfacectl instance:

```
=== Validation Provenance ===
Git SHA: 00257690b2b5eb6cff9697d78b0fa5463826f9c7
Binary: ./node_modules/.bin/interfacectl
CLI Version: 0.1.0
Workspace Root: /Users/mike/Cursor/surfaces-monorepo
Contract: ./contracts/surfaces.web.contract.json
Schema SHA256: 14cf37352533b768184d51ab6d4d55f95a833a9f1466a558cc774cd45be4262f
```

**Build method:** Workspace-local, built from source via `pnpm validate:ci`  
**Validator package:** `@surfaces/interfacectl-validator@0.1.0`  
**CLI package:** `@surfaces/interfacectl-cli@0.1.0`  
**Instance type:** Workspace dependency (built from `interfacectl-tooling/packages/` in this monorepo)

This ensures deterministic validation using:
- **Exact code state:** Git SHA proves which commit was validated
- **Exact tool version:** CLI version and binary path prove which interfacectl ran
- **Exact contract:** Contract path proves which contract file was validated
- **Exact schema:** Schema SHA256 proves which schema was bundled into the validator

No registry dependency—everything is reproducible from this workspace commit.

### Contract Changes

Added top-level `color` policy section to `contracts/surfaces.web.contract.json`:

```json
{
  "color": {
    "sourceOfTruth": {
      "type": "tokens",
      "tokenNamespaces": ["--color-", "--surfaces-color-", "--background", "--foreground", "--surface"]
    },
    "rawValues": {
      "policy": "warn",
      "allowlist": [],
      "denylist": []
    },
    "semantics": {},
    "consistency": {}
  }
}
```

**Note:** `allowedColors` fields remain in all three surfaces to demonstrate deprecation warnings.

**Update:** Semantic token namespaces (`--background`, `--foreground`, `--surface`) were added to `tokenNamespaces` to eliminate intentional-token false positives. These tokens are intentionally used across surfaces and should not trigger namespace violations.

### Validation Results Summary

Running `pnpm validate:ci` produces the following findings:

**Total Findings:** 5 warnings (updated after adding semantic token namespaces)
- **3** `contract.deprecated-field` warnings (one per surface for `allowedColors`)
- **0** `color.token.namespace.violation` warnings (down from 7 after adding semantic token namespaces)
- **2** `color.raw-value.used` warnings

**Before/After Counts:**
- `color.token.namespace.violation`: **7 → 0** (semantic token namespaces added to eliminate intentional-token false positives)

**Traceability Verification:**
All warnings now include location metadata (file, line, property, value) enabling rapid fixes:
- Raw color warnings include: `apps/surfaceops-web/app/globals.css:34 (background)` with `rgba(15, 23, 42, 0.3)`
- Raw color warnings include: `apps/surfaces-web/app/globals.css:34 (background)` with `rgba(255, 255, 255, 0.8)`
- Developers can fix violations without searching - all necessary information is in the output

### Warning Breakdown by Code

#### `contract.deprecated-field` (3 warnings)
- **Purpose:** Migration signal
- **Location:** `/surfaces/0/allowedColors`, `/surfaces/1/allowedColors`, `/surfaces/2/allowedColors`
- **Message:** "allowedColors is deprecated; migrate to color.sourceOfTruth + color.rawValues"
- **Action:** These represent **migration work** - surfaces should migrate from `allowedColors` to the new `color` policy structure

#### `color.token.namespace.violation` (0 warnings, down from 7)
- **Purpose:** Drift detection
- **Status:** Eliminated by adding semantic token namespaces (`--background`, `--foreground`, `--surface`) to the contract
- **Previous Distribution (before fix):**
  - `interfacectl-web`: 3 violations (`--background`, `--foreground`, `--surface`)
  - `surfaceops-web`: 2 violations (`--background`, `--foreground`)
  - `surfaces-web`: 2 violations (`--background`, `--foreground`)
- **Resolution:** Semantic token namespaces were added to `tokenNamespaces` to recognize these intentionally-used tokens. False positives from font/contract variables were already eliminated by tightening color extraction to only scan color-bearing CSS properties.

#### `color.raw-value.used` (2 warnings)
- **Purpose:** Drift detection
- **Distribution:**
  - `surfaceops-web`: 1 violation (`rgba(15, 23, 42, 0.3)`) at `apps/surfaceops-web/app/globals.css:34 (background)`
  - `surfaces-web`: 1 violation (`rgba(255, 255, 255, 0.8)`) at `apps/surfaces-web/app/globals.css:34 (background)`
- **Action:** These represent **drift** - code is using raw color literals instead of color tokens. These should be remediated by replacing with appropriate color tokens or adding to the `rawValues.allowlist` if they are intentionally used.
- **Traceability:** All violations include exact file path, line number, CSS property, and literal value. No searching required to locate and fix violations.

### Migration vs Drift

- **Migration warnings (`contract.deprecated-field`):** Indicate that the contract structure needs to be updated to use the new `color` policy instead of `allowedColors`. This is intentional technical debt to demonstrate the deprecation path.

- **Drift warnings (`color.token.namespace.violation`):** Indicate that the actual code implementation uses color tokens that don't conform to the declared namespace policy. This represents real drift that should be addressed through code changes or policy adjustment.

### Evolution Without Breakage

**Deprecation Pattern:** The contract demonstrates safe evolution through the `allowedColors` → `color` policy migration:

1. **Old field remains valid** - `allowedColors` still validates (not rejected by schema)
   - ✅ Exit code allows warnings (validation doesn't fail)
   - ✅ Old surfaces continue to work during migration

2. **Replacement field is active** - `color.sourceOfTruth` and `color.rawValues` are validated
   - ✅ New policy rules are enforced immediately
   - ✅ Both old and new systems run in parallel

3. **Migration path is obvious** - Deprecation warnings clearly indicate:
   - ❌ What to remove: `allowedColors`
   - ✅ What to add: `color.sourceOfTruth` + `color.rawValues`
   - 📍 Where it appears: `/surfaces/0/allowedColors`, etc.

4. **Migration is safe** - Warnings are non-blocking, allowing gradual adoption:
   - Developers can migrate at their own pace
   - No forced breaking changes
   - Clear remediation guidance in warning messages

This pattern enables Surfaces to evolve correctness rules without breaking existing contracts or surfaces.

**Traceability Verification:**
- ✅ All warnings include surface identification
- ✅ All warnings include file path and line number
- ✅ All warnings include CSS property name (for color violations)
- ✅ All warnings include literal value (for raw-value violations)
- ✅ Zero false positives from non-color domains (fonts, motion, layout variables)
- ✅ Developers can fix violations without searching - all location metadata is present

**Single-Command Demo Verification:**

Running `pnpm validate:ci` successfully demonstrates all three correctness dimensions:

- ✅ **Layout correctness:** All surfaces validated for `maxContentWidth` compliance
- ✅ **Color token namespace enforcement:** 0 violations (semantic token namespaces configured)
- ✅ **Raw color literal detection:** 2 warnings with location metadata (`apps/*/globals.css:34 (background)`)
- ✅ **Deprecation warnings:** 3 warnings (`allowedColors` → `color` policy migration)
- ✅ **Drift warnings:** 2 warnings with file:line:property metadata

**Demo Success Criteria Met:**
- ≥1 layout correctness check ✅
- ≥1 deprecation warning ✅
- ≥1 drift warning with file:line:property ✅
- 0 false positives from non-color domains ✅

**Next Steps:**
1. ~~Refine color extraction to exclude non-color CSS variables (fonts, contract variables)~~ ✅ **Completed** - Color extraction now only scans color-bearing CSS properties
2. ~~Consider expanding token namespaces to include semantic tokens like `--background`, `--foreground` if they're intentionally used~~ ✅ **Completed** - Semantic token namespaces added to contract
3. ~~Add location metadata to violations~~ ✅ **Completed** - All violations now include file, line, property, and value
4. Remediate raw color value findings (2 remaining: `rgba(15, 23, 42, 0.3)` and `rgba(255, 255, 255, 0.8)`)
5. Migrate surfaces from `allowedColors` to `color` policy once drift is understood