# Feature Plan

## Summary

Use the approved outlined Inter 780 Simple Slab lockups on surfaces.systems. Replace the homepage's live-text reconstruction and the public reference's separate mark/name compositions with complete canonical SVG assets. Refresh the exposed lockup downloads, secondary variants, social-card identity, and brand kit from those same sources.

## Strategy alignment

The approved identity is a contract for generated interfaces. The site should preserve the owner's exact geometry, typography, proportions, spacing, and Nickel treatment instead of producing a similar composition.

## Contract impact

1. Contract definition: primary light and reversed horizontal SVG bytes match the canonical brand package at revision `1d29168a9d35bc4f45de857afd7b43ea404532f8`. The visible mark height is 60 units, type cap height is 38, ink gap is 20, minimum padding is 24, and canvas height is 109. Type is outlined Inter 780 at optical size 32. Scale the entire asset uniformly.
2. Enforcement timing: at `Generation time`, the approved SVG files and lockup contract supply the identity and the existing site components consume them. At `CI/CD time`, focused Vitest assertions check canonical hashes, complete-asset consumption, accessible links, download consistency, and public archive contents. TypeScript, ESLint, the production build, and existing contract checks verify the application. `Runtime (edge)` enforcement semantics are unchanged. Browser QA checks actual rendering in light/dark desktop/mobile contexts.
3. Violation handling: block publication for a changed primary SVG hash, a recomposed/live-text logo, stale archive content, a stretched or clipped lockup, inaccessible home links, or navigation regressions.

## Surface impact

1. surfaces.systems: homepage header/footer and HTML reference, public design-system chrome/identity specimens, downloadable logo files, social-card logo, and brand kit.
2. surfaceops.ai and interfacectl: unchanged.

## Non-goals

1. Homepage copy, navigation, hero imagery, standalone slab/favicons, semantic theme tokens, and enforcement behavior remain outside this change.
2. No new theme switcher or dependency. The header and footer remain fixed dark; the reference chrome remains fixed light. Logo color follows the actual surface.
3. Existing monochrome downloads retain their documented single-plate exception. Primary and grayscale lockups retain the Nickel lower slab.

## Acceptance criteria

1. Homepage header/footer load the complete canonical reversed SVG with no retyped name or cropped viewBox.
2. Public reference chrome loads the complete canonical light SVG; its dark identity specimen loads the reversed SVG.
3. Every lockup preserves natural aspect ratio, clear space, and internal proportions at desktop and mobile sizes.
4. Home links retain accessible names; decorative logo images use empty alt text.
5. Both primary public SVG hashes exactly match the approved package, and the public ZIP contains those same bytes.
6. Secondary and monochrome variants use the same outlined glyphs and approved proportions; only documented theme/one-color fills vary.
7. The standalone wordmark and embedded social-card logo use the approved outlined glyphs.
8. Focused tests, lint, type-check, build, and contract checks pass, and browser QA finds no overflow, clipping, broken images, or console errors in light/dark desktop/mobile views.

## Risks and drift checks

1. Font fallback or mark/name recomposition: consume complete outlined SVGs and check their approved hashes.
2. Theme inversion on fixed surfaces: keep fixed-dark chrome reversed and fixed-light chrome primary; verify computed backgrounds and actual image sources in both system themes.
3. Stale public downloads: rebuild the ZIP from public files and assert archived primary bytes match served files.

## Implementation outline

1. Vendor the approved primary SVGs and outlined secondary/wordmark sources.
2. Update complete-lockup consumers and preserve responsive navigation behavior.
3. Refresh secondary aliases and the social-card logo, document usage, and rebuild the deterministic public kit.
4. Run focused checks and desktop/mobile light/dark browser QA before review and publication.
