# Feature Plan: unlisted tide prototype gallery

## Summary
Publish the existing eight tide prototypes and full experiment report on surfaces.systems at a direct URL. Preserve the paired model/resource order, model and effort labels, Impeccable assigned directions, fourteen locations, and light-only presentation. Keep the gallery out of navigation, listings and the sitemap.

## Strategy alignment
The gallery makes a bounded generation experiment inspectable, including the contracts, gates, repairs and limits behind the output. It supports review of how a resource changes generated interfaces; it does not establish Surfaces product readiness or general model superiority.

## Contract impact

1. Contract definition: no platform contract semantics change. The publication invariants are eight existing artifacts, exact common fixture, full report, assigned directions, no demo-data banners, and no discovery links elsewhere on the site.
2. Enforcement timing: Generation time uses an explicit file allowlist and public-copy redaction. CI/CD time validates link closure, bundle identities, required metadata, and the production build. Runtime (edge) serves the static bundle with scoped `X-Robots-Tag: noindex, nofollow, noarchive` and `Referrer-Policy: no-referrer` headers.
3. Violation handling: block publication if files or links escape the approved bundle, public copies expose local runtime paths or session identifiers, app inputs change, or the gallery becomes discoverable through site navigation or sitemap. No authentication is added; this is an unlisted URL.

## Surface impact
Only surfaces.systems receives the frozen static publication and scoped response headers. The current production base is `8ff4b612fe56ff8ebce67f0c8a3f3885ea46407b`. Work uses an isolated checkout because the canonical checkout contains unrelated edits.

## Non-goals
Regenerating prototypes, changing design-resource behavior, adding live tide data, modifying homepage/navigation/sitemap, publishing local transcripts or historical galleries, or changing access controls.

## Acceptance criteria

- All eight prototypes render within the gallery in paired resource order.
- Each app exposes all fourteen locations and both supplied days.
- Model names and Medium reasoning labels remain; both Impeccable cards show their assigned direction.
- No demo-data banners or system-driven dark mode return.
- The full report and its retained evidence links resolve within the published bundle.
- Every published HTML page has noindex metadata; every bundle response receives the scoped crawler/referrer headers.
- Homepage, navigation, robots.txt and sitemap.xml have no new gallery links.
- No local filesystem paths, raw transcripts, private session identifiers, old gallery files or credentials are published.
- Production serves the verified commit and gallery bundle; the original local evidence remains intact.

## Risks and drift checks

- Unlisted content could be indexed: add HTML metadata and scoped response headers; do not add a sitemap or robots.txt route listing.
- A broad directory copy could publish history or private runtime records: publish only the audited current link closure and sanitize public copies.
- A site deployment could carry unrelated edits: isolate from the verified production/main commit and review the intended diff before deployment.

## Implementation outline

1. Stage the audited static bundle and public report copies under one opaque experiment path.
2. Add scoped response headers and verify every retained local link and fixture.
3. Run focused build and rendered checks, preserve the source commit, and publish through the existing Vercel project.
4. Verify the live direct URL, all eight apps, report, crawler headers and unchanged site discovery surfaces.
