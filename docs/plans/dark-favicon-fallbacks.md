# Feature Plan: dark favicon fallbacks

## Summary
Browsers can use an unqualified ICO or Apple icon even when explicit themed links are present. Use the shared dark Ink/Ivory/Nickel presentation for those fallbacks and keep both explicit theme variants. Synchronize previous browser/install URLs and make their export manifests describe the bytes they serve.

## Strategy alignment
The approved identity is an owner-defined invariant. Deterministic source and export checks prevent a browser fallback from silently changing that presentation.

## Contract impact
1. Contract definition: add a dark browser default, dark opaque platform plates, declared legacy icon revisions and pinned legacy export provenance. Preserve the existing raster recipe, exact master geometry, 48/36 mark heights, headers and social artwork.
2. Enforcement timing: at `Generation time`, generators consume the pinned source/recipe and build current assets and legacy aliases. At `CI/CD time`, tests and drift checks enforce ICO pixels, dark outer edges, alias bytes and truthful manifests. `Runtime (edge)` policy semantics stay unchanged.
3. Violation handling: source, revision, edge, hash or alias drift fails validation and blocks publication.

## Surface impact
Only surfaces.systems browser icons, Apple/PWA icons, compatibility URLs and the downloadable brand kit change. No surfaceops.ai or interfacectl implementation changes.

## Non-goals
Change master coordinates, scale/radius, explicit light assets, header lockups, sharing artwork, product messaging, authentication, or user browser profiles/cache.

## Acceptance criteria
1. All ICO frames and unqualified browser SVG aliases use the exact current dark tile.
2. Explicit light/dark SVG and PNG links retain their media queries and receive a new content-derived revision.
3. Apple/PWA/maskable icons are opaque Ink with Ivory/Nickel marks, retaining 48/36 heights and maskable safety.
4. Partial-alpha pixels around dark tile corners remain Ink with no pale matte.
5. Both previous icon revision directories serve byte-identical current icon aliases.
6. Every legacy manifest export hash matches served bytes, and original non-icon provenance remains identified separately.
7. Canonical masters, header lockups, raster recipe and social bytes remain unchanged.
8. Focused tests, type-check, deterministic drift checks, build and responsive local browser proof pass.

## Risks and drift checks
1. A browser may select a different fallback. Use the same dark policy across ICO, unqualified browser aliases and platform icons.
2. A generated legacy manifest could become its own input. Use a pinned source snapshot and verify repeated builds are idempotent.
3. Alias regeneration could alter historical non-icon artwork. Copy only the declared icon filenames and compare protected files with the clean baseline.

## Implementation outline
1. Change the source contract and provenance input.
2. Generate current dark fallbacks and explicit legacy aliases.
3. Update focused tests and usage rules, then validate and prepare the scoped release.
