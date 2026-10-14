# Feature Plan

## Summary

Complete the Surfaces browser, install, and sharing assets from the approved Simple Slab geometry and outlined Inter 780 lockups. Replace the old sharing composition, publish crawler-compatible PNG previews, and wire the real Next metadata to versioned browser icons, opaque touch/install icons, and a web manifest. Preserve page messaging and the approved header/footer lockups.

## Strategy alignment

The owner's brand decision is an explicit invariant for generated interfaces. Source fingerprints, deterministic exports, and metadata tests block stale or reconstructed identity assets before publication.

## Contract impact

1. Contract definition: `apps/surfaces-web/brand-source/contract.json` pins the canonical mark/lockup inputs, the three slab coordinates, Nickel treatment, and layout rules. Generated `public/brand/canonical-1d29168/exports.json` records output dimensions and fingerprints. Social logos use the complete outlined lockup with uniform scaling. Install icons are opaque and keep all mark ink inside the maskable safe circle.
2. Enforcement timing: at `Generation time`, `scripts/build-surfaces-site-brand.py` verifies source fingerprints and generates the assets without font fallback. At `CI/CD time`, focused tests verify source/output hashes, metadata, PNG/ICO dimensions, manifest references, and existing canonical lockups. Browser QA verifies actual head/resource responses in desktop/mobile and light/dark contexts. `Runtime (edge)` contract semantics are unchanged.
3. Violation handling: the generator and tests fail for altered inputs, export drift, incorrect formats/dimensions, missing assets, or stale SVG-only sharing metadata. Publication is blocked until the candidate passes review and browser checks.

## Surface impact

1. surfaces.systems: browser favicons, Apple touch/install icons, manifest, home/demo/adaptive sharing previews, all design-system sharing metadata, standalone HTML head, and public downloadable brand kit.
2. surfaceops.ai and interfacectl: unchanged.

## Non-goals

1. No page messaging, navigation, theme behavior, approved lockup bytes, hero image, or runtime enforcement changes.
2. The manifest supplies install metadata and icons; it does not add offline behavior or a service worker.

## Acceptance criteria

1. Actual Next head exposes explicit light/dark SVG browser marks, PNG fallbacks, conventional favicon.ico, an opaque Apple touch icon, and a manifest.
2. Favicons preserve the exact `0 0 64 64` master geometry and Nickel lower slab at 16/32/48 px.
3. Touch/install PNGs are opaque, use the reversed mark on Ink, and maskable exports keep every slab inside the central safe circle.
4. Root and every child metadata override advertise versioned 1200 by 630 PNG social previews with the complete outlined Inter 780 lockup.
5. The public legacy social URL and brand kit no longer expose the old mark-to-wordmark composition.
6. The source generator is repeatable, requires no installed font, and records source/output hashes.
7. Focused tests, lint, type-check, production build, and local browser resource checks pass. Existing canonical horizontal SVG hashes remain unchanged.

## Risks and drift checks

1. A framework-generated icon overrides explicit theme variants: remove the obsolete app icon route and inspect the final head in both themes.
2. Existing browser/crawler caches retain previous artwork: use canonical revision paths for advertised assets and update conventional legacy fallbacks.
3. Social copy gains font fallback: keep copy as checked-in outlines; default builds consume vector source and never resolve a local font.

## Implementation outline

1. Vendor fingerprinted canonical mark sources and prepared social-copy outlines.
2. Generate browser/touch/install/social exports and the manifest, then rebuild the public kit.
3. Wire all metadata consumers and add focused source/export/metadata tests.
4. Inspect real icon/social pixels and run browser head/resource checks before the scoped commit.
