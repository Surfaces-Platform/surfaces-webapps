# Surfaces site brand sources

The contract pins the three canonical mark sources and both complete horizontal lockups from the approved brand package at `1d29168a9d35bc4f45de857afd7b43ea404532f8`. The primary horizontal files remain byte-identical. Preserve the exact `0 0 64 64` master and all three slab coordinates, the Nickel lower slab, and the complete outlined Inter 780 wordmark.

Rebuild from the repository root with Python 3 and ImageMagick:

```sh
python3 scripts/build-surfaces-site-brand.py
python3 scripts/build-surfaces-brand-kit.py
python3 scripts/build-surfaces-site-brand.py --check
```

The default generator consumes checked-in vector outlines and needs no installed font. The revision is the first 16 SHA-256 characters of sorted compact JSON for `contract.json`, excluding its `revision` field, prefixed with `canonical-`. After an approved recipe/source change, the generator reports the required revision. Update the contract revision and the standalone `app/homepage-content.html` head, then rebuild. Next metadata imports the contract revision directly. New presentation recipes receive new URLs so browsers and crawlers request the current assets.

Browser icons use a transparent 64-unit canvas in both themes, without a plate or outline (radius 0). Light artwork uses Ink/Nickel; dark artwork uses Ivory/Nickel. A uniform external transform centers the original visible ink at `(32,32)` with a height of 48. Never change the source polygons. Icon rasterization uses ImageMagick with background none, density 384, exact target resize, stripped metadata, sRGB, and PNG32 (PNG24 for opaque install plates). The social renderer stays separate to preserve the reference bytes.

The hash-pinned `favicon-theme.js` controller runs as a classic synchronous script in the head, before parsing finishes. Its `data-light-icon` and `data-dark-icon` attributes point to versioned 16/32/48 ICOs. It inserts exactly one typed browser icon and updates that same link when appearance changes. Do not add competing static PNG/SVG icon links or async/defer/module attributes. The no-JavaScript fallback is a single light ICO inside noscript. SVG/PNG files remain available as exports, and the conventional `/favicon.ico` and unqualified SVG aliases remain dark compatibility assets.

Native Safari testing showed that boxed artwork can gain a contrast frame and that ICO media pairs can select by declaration order. Transparent artwork plus one initial theme-selected ICO passed fresh-host light and dark checks. Safari may retain a processed icon by hostname after appearance changes; changing the DOM link does not guarantee immediate native toolbar refresh.

Apple and regular PWA icons use a 48-unit Ivory/Nickel mark on an opaque square Ink plate. Platform masking applies outside this artwork. The separate maskable alternate uses a centered 36-unit Ivory/Nickel mark, keeping all ink inside the central 80-percent-diameter safe circle. Do not round the install source plate. Safari pinned-tab icons retain the canonical one-color exception.

Every sharing entrypoint uses the same opaque 1200×630 Ink canvas and complete reversed lockup. Scale the whole canonical viewBox by `min(2.8, 960 / viewBoxWidth)` and center that frame. Do not add a tagline, radius, title panel, or domain to the artwork. Page titles and descriptions stay in Open Graph/Twitter metadata for the native preview. The Surfaces PNG remains byte-identical to the approved dark reference. Legacy reference-copy outlines remain historical inputs and are not consumed by the active generator.

The generator writes versioned browser/install/social exports, conventional aliases, the web manifest, documentation specimens, and source/output fingerprints. The kit generator reads the same revision and packages those files. Focused tests verify source hashes, exact geometry, layout/plate rules, ICO frames, manifest references, metadata overrides, and ZIP contents. `--check` rerenders to a temporary directory and fails on export drift without changing the checkout.

The `legacyIconRevisions` list keeps prior browser/install URLs synchronized with the current icon recipe. `legacy-icon-exports.json` is a checked-in source snapshot of the original export provenance, pinned by `legacyExportsSource`. The generator reads that source rather than generated legacy manifests. Each regenerated legacy manifest declares `aliasOf` for the current export manifest, fingerprints the actual served bytes, and preserves original non-icon provenance separately. This alias stage leaves all mark, lockup and social file bytes unchanged. A `--check` run verifies current and legacy icon outputs together.
