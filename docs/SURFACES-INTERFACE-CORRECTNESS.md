# Surfaces: Interface Correctness as Operational Discipline

## What "Correct Interface" Means

A correct interface is one that meets shared expectations consistently across multiple surfaces. Surfaces defines these expectations in machine-readable contracts—not ad-hoc rules in code, not scattered style guides, but a single source of truth that every surface must comply with.

The contract specifies correctness across multiple dimensions:

- **Layout:** Content width constraints, required container selectors
- **Color:** Token namespace policies, raw value restrictions
- **Motion:** Allowed animation durations, timing functions
- **Sections:** Required structural elements, content organization

These dimensions are extensible—the same pattern applies to accessibility, interaction constraints, state transitions, and any other correctness requirement you need to enforce.

## How Correctness is Enforced Early

Surfaces catches drift before production through static analysis of CSS and JSX during development. The validator scans your codebase, extracts interface patterns, and compares them against the contract definition.

**Key strength:** Every violation includes exact location metadata—file path, line number, CSS property, and literal value. You can fix issues immediately without searching through files.

For example, a raw color literal violation shows:

```
Raw color value "rgba(15, 23, 42, 0.3)" is not allowed for surface "surfaceops-web".
in apps/surfaceops-web/app/globals.css:34 (background)
```

This isn't a suggestion—it's a precise instruction: go to line 34, find the `background` property, replace the raw value with an allowed token.

**No special casing:** Generated UI is validated exactly the same way as human-written UI. There's one validation path, one set of rules, one contract—no exceptions.

## How Rules Evolve Safely

Surfaces uses a three-tier maturity model to gradually evolve correctness rules from informational to enforced:

1. **`"off"`** - Defined but not evaluated (rule exists, validation disabled)
2. **`"warn"`** - Evaluated, non-blocking (violations emit warnings, don't block builds)
3. **`"strict"`** - Evaluated, blocking (violations emit errors, block deployments)

This lets you validate rules at low risk before making them blocking. Start with warnings, monitor false positives, refine allowlists, build team consensus—then graduate to strict enforcement when confidence is high.

**Deprecation without breakage:** Old rules remain valid while new rules are adopted. The contract shows this with `allowedColors` → `color` policy migration: deprecation warnings clearly indicate what to remove and what to add, but old contracts continue to work during migration.

**Policy-level encoding:** Enforcement changes happen in the contract, not in code. You can adjust strictness, add exceptions, or graduate rules without modifying validator logic or redeploying surfaces.

## Concrete Example

Consider a raw color literal violation:

- **Detection:** `rgba(15, 23, 42, 0.3)` found in `apps/surfaceops-web/app/globals.css:34 (background)`
- **Policy:** `color.rawValues.policy: "warn"` (non-blocking today)
- **Remediation:** Replace with `var(--background)` or add to `rawValues.allowlist` if intentionally used
- **Evolution:** When ready, graduate to `"strict"` to block raw values entirely

The entire workflow—detection, remediation, evolution—is traceable, automatic, and contract-driven.

## Why This Matters

Surfaces isn't about design tokens, style guides, or design systems—those are applications of the correctness model, not the thesis itself.

The thesis is: **Interface contracts define correctness; validators enforce it; maturity model evolves it safely.**

This enables:

- **Shared correctness** across multiple surfaces without copying rules
- **Early detection** of drift before it reaches production
- **Safe evolution** of correctness rules as requirements change
- **Generator-friendly** contracts that AI tools can consume to produce compliant code

Whether you're enforcing color tokens, layout constraints, motion rules, or future correctness dimensions (accessibility, interactions, state), the same pattern applies: define in contract, enforce via validation, evolve through maturity model.

## The Litmus Test

A reader should understand Surfaces without ever seeing a color example. Color is illustrative, not foundational. If the narrative collapses without color examples, it's too narrow.

Surfaces is interface correctness infrastructure—not a smarter style linter, not a design token manager, not a visual diff tool. It's the operational discipline that keeps multiple surfaces aligned to shared expectations, verified automatically, evolved safely.

That's what "correct interface" means.

