# Feature Plan: shared brand entrypoints

## Summary
Align Surfaces browser icons with the shared three-product tile contract: radius 8, centered 48-unit visible mark, explicit light/dark plates, and Nickel retained. Regular Apple/PWA icons use the same mark height on a square plate; maskable icons use a 36-unit safe-area alternate. All public sharing metadata uses the existing dark Surfaces reference composition.

## Strategy alignment
The approved brand presentation is an owner-defined invariant for generated interfaces. Deterministic source/export checks block drift before the interface ships, supporting the strategy's decision filter without changing product positioning or enforcement semantics.

## Contract impact
1. Contract definition: pinned canonical masters and whole outlined lockups stay immutable. The source contract defines browser radius/height/center, install variants, a shared social layout, and content-derived revisions.
2. Enforcement timing: at `Generation time`, the asset generator validates fingerprints and generates only the declared presentation. At `CI/CD time`, focused tests, generator drift checks, the production build, and browser checks enforce geometry, output/metadata alignment, and cache-visible URLs. `Runtime (edge)` policy semantics remain unchanged.
3. Violation handling: source drift, an incorrect revision, altered geometry, out-of-bounds maskable ink, stale exports, or metadata disagreement fails the relevant check and blocks publication.

## Surface impact
1. surfaces.systems: browser icons, Apple/PWA/manifest, compatibility aliases, documentation specimens/ZIP, and all social metadata consumers.
2. surfaceops.ai and interfacectl: no implementation changes.

## Non-goals
Change canonical master geometry, horizontal header lockups, product messaging, auth behavior, authenticated provider pages, native apps, or shared orchestration.

## Acceptance criteria
1. Original three slab coordinates and both horizontal lockup hashes remain unchanged.
2. Light/dark browser SVG and PNG exports have radius 8 and centered 48-unit mark height with the shared palette.
3. Actual head has distinct versioned theme-aware SVG and 16/32 PNG links; ICO/root aliases use the current dark fallback.
4. Apple and regular PWA exports have opaque Ink square plates and a 48-unit Ivory/Nickel mark; maskable exports have 36-unit ink fully inside the safe circle.
5. Contract/source changes produce a new revision path; Next and standalone HTML heads agree.
6. Every public sharing override advertises the same dark 1200×630 whole-lockup composition. Existing metadata titles/descriptions remain appropriate.
7. The approved Surfaces reference PNG hash stays unchanged and docs/legacy aliases and ZIP match current outputs.
8. Focused tests, deterministic rebuild/drift checks, production build, and desktop/mobile light/dark browser/resource/pixel review pass.

## Risks and drift checks
1. Geometry could be redrawn to fit the tile. Preserve exact master polygons and apply only uniform outer transforms.
2. A favicon cache could conceal the update. Derive the revision from the full presentation contract/source hashes and advertise new explicit URLs.
3. Sharing could add promotional copy or become design tooling. Reuse the existing plain dark composition and keep titles in metadata.

## Implementation outline
1. Update the source contract and usage rules.
2. Generate icons/social/manifest/aliases and refresh the public kit.
3. Update metadata consumers and focused invariant tests.
4. Build, inspect actual head/resources and small pixels, and hand the scoped candidate to the release owner.
