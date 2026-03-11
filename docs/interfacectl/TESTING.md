# TESTING.md — Contract Validator MVP Checklist

This checklist verifies that `interfacectl validate` works as designed: deterministic, contract-first, static (no runtime probing), and CI-safe.

## Assumptions

1. Contract file lives at: `contracts/surfaces.web.contract.json`
2. The shared resolver can find the CLI via explicit env overrides, `SURFACES_INTERFACECTL_ROOT`, a sibling standalone checkout, an installed package, or the local submodule fallback.
3. Validation command is invoked via `node scripts/interfacectl-tool.mjs run cli validate`.
4. Validator is static/deterministic (no Next.js dev server, no runtime probing).

## Conventions

1. “PASS” means exit code `0`
2. “FAIL” means exit code non-zero
3. Prefer running with `--json` once output exists:
   1. Human output is readable
   2. JSON output is machine-consumable and stable

---

## 1) Smoke test: command exists and runs

1. Run:
   1. `node scripts/interfacectl-tool.mjs run cli validate`
2. Expect:
   1. PASS when repo is in a compliant state
   2. Output includes a summary (counts of errors/warnings) or clear success message
3. Record:
   1. Exact command used (so CI and docs match)

---

## 2) Contract loading and parse errors

### 2.1 Invalid JSON fails fast

1. Temporarily corrupt JSON (e.g., delete a comma) in `contracts/surfaces.web.contract.json`
2. Run validate
3. Expect:
   1. FAIL
   2. Error clearly indicates a JSON parse problem
   3. Output references the contract file path
4. Undo change

### 2.2 Missing required field fails fast

1. Remove a required top-level field (example: `constraints` or `surfaces`)
2. Run validate
3. Expect:
   1. FAIL
   2. Error clearly indicates contract/schema validation problem
   3. Points to missing field
4. Undo change

### 2.3 Duplicate section IDs in contract are rejected

1. Duplicate a section id in a surface route, e.g. add a second `"states"` section
2. Run validate
3. Expect:
   1. FAIL
   2. Error clearly states duplicate section id and which surface/route
4. Undo change

---

## 3) Anchor drift detection (core behavior)

> Goal: prove structural drift is detected deterministically and is actionable.

### 3.1 Missing required section ID in a surface

1. In one app, rename a required section id:
   1. Example: in surfaceops app, change `id="states"` → `id="state"`
2. Run validate
3. Expect:
   1. FAIL
   2. Finding includes:
      1. Which surface (domain or appRoot)
      2. Expected section id(s)
      3. What was found (or “missing”)
      4. Suggested fix (restore id or update contract)
4. Undo change

### 3.2 Section present but wrong surface

1. Move a required section id from one surface to another (or copy it)
2. Run validate
3. Expect:
   1. FAIL in the surface missing the section
   2. Optional: warning/error about duplicate ids across surfaces (if implemented)
4. Undo change

### 3.3 Unexpected extra section (strictness behavior)

1. Add a new `<section id="foo">` (or equivalent) that is not in the contract
2. Run validate
3. Expect one of:
   1. FAIL (strict mode), OR
   2. WARN (permissive mode)
4. Output must clearly indicate:
   1. The unexpected id
   2. Which surface
   3. Next action: remove it or update contract
5. Undo change

---

## 4) Typography drift (allowed fonts + per-surface font)

> Goal: enforce “Inter + JetBrains Mono only” and the correct font per surface.

### 4.1 Disallowed font is detected

1. Add an import or usage of any font not allowed (example: Roboto)
2. Run validate
3. Expect:
   1. FAIL
   2. Finding includes:
      1. Disallowed font name
      2. Allowed fonts list
      3. File path/location if possible
4. Undo change

### 4.2 Wrong font for surface is detected

1. Make the interfacectl surface use Inter (or make the light surfaces use JetBrains Mono) contrary to the contract
2. Run validate
3. Expect:
   1. FAIL
   2. Finding is surface-scoped and explicit (expected vs found)
4. Undo change

---

## 5) Layout constraint: 1120px max content width

> Goal: validate a deterministic layout signal without running the app.
> This should be implemented via a stable convention (shared Container component, token, or class).

### 5.1 Remove or bypass the required container

1. In one surface, remove the shared container wrapper or replace it with a non-standard wrapper
2. Run validate
3. Expect:
   1. FAIL
   2. Finding includes:
      1. Surface
      2. Expected layout convention (e.g., Container usage or token/class)
      3. File path/location if possible
4. Undo change

### 5.2 Change max width away from 1120

1. Change the constant/token/class so width is not 1120 (example: 1200)
2. Run validate
3. Expect:
   1. FAIL
   2. Finding includes expected (1120) vs found
4. Undo change

---

## 6) Motion constraint: 120ms linear only

> Goal: enforce motion rules via constants/tokens (not by running the UI).

### 6.1 Transition duration violation

1. Change the transition duration constant from `120` to something else (example: 200)
2. Run validate
3. Expect:
   1. FAIL
   2. Finding includes expected (120ms) vs found
4. Undo change

### 6.2 Easing violation

1. Change easing from `linear` to another value (example: `ease-in-out`)
2. Run validate
3. Expect:
   1. FAIL
   2. Finding includes expected (linear) vs found
4. Undo change

---

## 7) Semantic routing integrity (contract-internal consistency)

> Goal: mappings must reference real section IDs for each target surface.

### 7.1 Mapping references nonexistent section

1. In the contract, change a semantic mapping to point to a nonexistent section id
2. Run validate
3. Expect:
   1. FAIL
   2. Finding includes:
      1. Which intent key
      2. Which surface mapping is invalid
      3. Valid section IDs for that surface (if implemented)
4. Undo change

---

## 8) Output quality (product-level requirements)

### 8.1 Deterministic ordering

1. Run validate twice with no changes
2. Expect:
   1. Output is identical (ordering, counts, phrasing)
   2. If timestamps exist, they must be optional/verbose-only

### 8.2 JSON output (if supported)

1. Run:
   1. `pnpm exec interfacectl validate --json`
2. Expect:
   1. Machine-readable JSON to stdout
   2. Contains at minimum:
      1. contract path + version
      2. findings array
      3. finding fields: id/code, severity, surface, message, expected, found, location (when available)
3. Run twice with no changes and confirm JSON is stable.

### 8.3 Exit codes (CI readiness)

1. Confirm these behaviors:
   1. PASS returns exit code `0`
   2. Contract parse/schema errors return a consistent non-zero code
   3. Validation errors return a consistent non-zero code
2. Document actual exit codes in `docs/interfacectl/contract-validation.md` (or equivalent).

---

## 9) CI simulation (local)

1. Create a temporary branch and introduce a deliberate violation (e.g., rename a section id)
2. Run validate
3. Expect FAIL
4. Revert fix and rerun validate
5. Expect PASS
6. This verifies the “break → detect → fix” loop.

---

## 10) Post-checklist cleanup

1. Ensure all temporary edits are reverted
2. Confirm `pnpm exec interfacectl validate` PASS on a clean working tree
3. Commit `TESTING.md` (this file) and any docs updates.

---
