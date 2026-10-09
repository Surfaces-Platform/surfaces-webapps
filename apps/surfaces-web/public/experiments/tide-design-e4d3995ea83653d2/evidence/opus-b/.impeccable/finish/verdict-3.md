## verdict
1. Same-tab desktop to mobile resize overflow (parent final-QA hold): resolved.
   - Source: `diff -r evidence/before-resize-fix/src src` shows one change only. `src/styles.css:102-103` adds a comment and `grid-template-columns: minmax(0, 1fr);` on `.sheet`.
   - Build: the built `dist/app.css` differs from the before-fix copy by that one declaration. `dist/app.js` and `dist/index.html` match the before-fix bytes by MD5. There is no JS change and no overflow, clip or hide rule.
   - Before the fix: `evidence/resize/before-desktop-to-mobile.png` is 1136px wide. The chart is still in its 1120px desktop form, with 3-hour ticks, and the "NEXT HIGH / NEXT LOW" fields are stretched to that width. `resize-before.json` records 56 failures out of 112, so the parent finding is reproduced.
   - After the fix: `evidence/resize/after-desktop-to-mobile.png` is 390 wide. The Crescent City, Oct 7 chart is reflowed to the narrow branch: 358px, 260px tall, 5 ticks (12a/6a/12p/6p/12a). The axis runs from −0.5 to 4.5 around H 3.90 and L 0.24. The noon marker sits at 2.07 m. The next-high and next-low cells fit the width and the selection is kept.
   - Desktop again: `after-mobile-to-desktop.png` regrows to the 1120px chart with 9 ticks. It matches the at-rest desktop composition.
   - `resize-after.json` records 0 failures out of 112, errors `[]`. The samples show sw=iw and now=chart=svg at both widths.
   - Interaction after resize: `scrub-desktop-to-mobile.png` shows the readout "2:00 p.m. · 3.65 m" with the column bar on the curve. `scrub-mobile-to-desktop.png` shows "3:00 p.m. · 3.90 m". Keyboard readouts in `resized-interaction.json` are correct for →, End, Home and Esc. Low labels in the scrub state stay ink on a white halo.

Regressions: none.
- `.sheet` is a single-column grid. An `auto` track with the default stretch already filled the 1200px max-width container at any stable width, so `minmax(0, 1fr)` changes no settled layout.
- Confirmed in the recaptured `.impeccable/review/desktop.png` (1280x829) and `mobile.png` (390x996). Each shows the same hero grid, next-high/next-low fields, misregistered marigold stroke, three-ink palette, #FDFDFB stock and chart scale as the verdict-2 captures.
- `qa-matrix.json` records 112 checks, 0 failures, errors `[]` and requests `/`, `/app.css`, `/data.js`, `/app.js`. `qa.json` shows no errors and no overflow.
- Detector log `11-detect-resize-fix.json` is `[]`. `public/data.js` and `dist/data.js` both hash to 18ec8e3bba4296b136276ed5d9b28ef2.

## remaining
clear. This ship covers only the narrow resize repair and checks the batch for regressions. It rests on the verdict-2 ship of the earlier items and is not a fresh full-surface review.

disposition: ship
