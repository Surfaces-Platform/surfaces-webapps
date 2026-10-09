# Feature Plan: consistent new-tab link indicators

## Summary

Links that open another tab or window show the same arrow-out-of-square icon and an "Opens in a new tab" tooltip. The homepage already follows this convention. Apply the convention to the eight "Open app" links in the unlisted tide gallery and check all public pages for future omissions.

## Strategy alignment

The convention makes navigation behavior visible before a user follows a link. An automated check prevents generated site changes from introducing a new browsing context without the expected indicator.

## Contract impact

1. Contract definition: links opening another browsing context require the standard external-link icon, the new-tab tooltip, and safe relationship attributes. Platform contract fields and routing behavior stay the same.
2. Enforcement timing: Generation time applies the convention to authored JSX and hosted HTML. CI/CD time scans every source page and published HTML document, including unlisted pages, and runs the existing rendered header tests. Runtime (edge) continues serving the static gallery with its existing crawler and referrer headers.
3. Violation handling: the test suite fails when a new browsing-context link lacks its icon, tooltip, or safe relationship attributes. Direct window-opening scripts fail the check so authors use an indicated link.

## Surface impact

Only surfaces.systems changes. The gallery wrapper receives eight icons. Its prototype apps, experiment evidence, ordering, destinations, and discoverability stay the same.

## Acceptance criteria

1. Each gallery "Open app" link includes the same 14px currentColor Heroicon used in the homepage header.
2. Each gallery link has the "Opens in a new tab" tooltip and `rel="noopener noreferrer"`.
3. Desktop and mobile layouts retain readable labels and visible icons.
4. Every source page and public HTML document participates in the check, including future files, named browsing-context targets, and inherited HTML targets.
5. Existing same-tab links retain their behavior and appearance.
6. All prototype assets, reports, evidence records, and noindex settings remain intact.

## Risks and drift checks

1. A future unlisted page could bypass a homepage-only check. Recursively scan the app and public trees.
2. Editing a prototype could invalidate historical experiment evidence. Change only the gallery wrapper and compare prototype/evidence files against the base commit.
3. Indicators could change navigation behavior. Preserve every destination and target, then verify links in desktop and mobile layouts.

## Implementation outline

1. Add the standard icon and tooltip to the gallery wrapper.
2. Add a site-wide source and HTML check to the existing test suite.
3. Run the surfaces-web tests and verify the gallery at desktop and mobile widths.
