Status: complete

The parent's final QA hold has been repaired. In a tab loaded at desktop size and then resized to mobile, the chart kept its 1120px width and the page overflowed. The fix is one CSS declaration. A fresh finish-reviewer pass scored the repair **ship**, with no regressions (`.impeccable/finish/verdict-3.md`). A fresh documenter synced DESIGN.md and design.json. Build, `npm run check`, the 112-check matrix, and a new 112-transition resize matrix all pass. See "Resize repair" below. The pre-fix source, dist, docs, RUN.md and receipts are kept unchanged in `evidence/before-resize-fix/` (MD5SUMS).

Everything below "Resize repair" is the earlier record. It describes the bytes before the fix, which were shipped under verdict-2.

The app is built and documented, and every data check passes. A fresh finish-reviewer verdict pass returned **ship** (`.impeccable/finish/verdict-2.md`). The documenter has synced DESIGN.md and `.impeccable/design.json` to the final source. The final detector run returned `[]`.

History: the first session stopped at its $3 cap with Status: partial, while the latest verdict was still **fix**. This continuation session did the remaining work; see "Continuation" below. All earlier receipts are kept unchanged.

## Resize repair (third session, parent final technical QA)
- **Inputs:** RUN.md, the receipts and RESPONSIVE-RESIZE-REPAIR.md. The parent's `evidence/parent/resizing-before.png` and `.json` were **not present** in this directory; only `ship-RUN-before-resize-fix.md` was there. I reproduced the finding myself instead.
- **Reproduction:** `evidence/resize/resize-qa.cjs before` on the old dist. It runs 112 same-tab transitions: 14 locations × 2 days × {desktop→mobile, mobile→desktop} × {file://, HTTP}, keeping the selection.
  - Result: 56 failures. Every desktop→mobile case gives scrollWidth=1136, with `.now`, `.chart` and the SVG all at 1120px. This matches the parent's numbers.
  - Saved as `evidence/resize/resize-before.json` and `before-desktop-to-mobile.png`.
- **Root cause:** `.sheet` is a grid with an implicit `auto` track. The SVG's explicit `width` (set from ResizeObserver) became the grid item's minimum content width. The track therefore could not shrink, the observed frame never got narrower, and ResizeObserver never reported a smaller width.
- **Fix (the only source change):** `src/styles.css` `.sheet { grid-template-columns: minmax(0, 1fr); }`, with a one-line comment.
  - No JS change, and no clip, hide or overflow rule.
  - The reviewer confirmed `dist/app.js` and `dist/index.html` are byte-identical to the pre-fix copies. `dist/app.css` differs only by that declaration.
  - craft-floor was re-read immediately before the edit.
- **QA after the fix:**
  - `npm run build` passes.
  - Resize matrix (`evidence/resize/resize-after.json`): 112/112 pass, console errors []. Each case checks no overflow, SVG width = chart width, the desktop SVG growing back to 1120, selection kept, height, event count and the noon marker.
  - Crescent City, Oct 7, desktop→mobile: scrollWidth 390, chart and SVG 358px, narrow 5-tick axis, 260px height.
  - Back to desktop: 1120px.
  - Interaction after each transition (`evidence/resize/resized-interaction.json`):
    - Keyboard: → gives 1:00 p.m. · 2.99 m, End gives 12:00 midnight, Oct 8 · 2.07 m, Home and Esc work.
    - Pointer scrub: mobile 2:00 p.m. · 3.65 m, desktop 3:00 p.m. · 3.90 m, the same as the initial-load matrix.
    - Event labels render, and the select caret is present.
  - Final matrix rerun (`evidence/qa/qa-matrix.json`): 112 checks, 0 failures, errors [], requests `/`, `/app.css`, `/data.js`, `/app.js`.
  - `npm run check`: errors [], no overflow at either viewport.
  - Screenshots were recaptured, and I inspected before and after for desktop→mobile, the full page for mobile→desktop, and the desktop scrub.
- **Resource calls:**
  - `./impeccable detect --json src/App.jsx src/styles.css dist/index.html` → `[]` (resource-log/11).
  - Same command after the docs sync → `[]` (resource-log/12).
  - No seed draw, reroll, interview or other resource was used.
- **Finish reviewer:** a fresh `impeccable-finish-reviewer` (agent a05799a22ead4167b, model `opus` = claude-opus-5-5, medium effort requested in the prompt, given only this run's packet plus an appended "Resize-repair packet" section).
  - Repair: **resolved**. Regressions: none. Disposition **ship**.
  - Receipt: `.impeccable/finish/verdict-3.md`.
  - Its scope: the narrow repair plus a regression check, building on verdict-2. It was not a new full-surface review.
  - review.md, verdict.md and verdict-2.md were confirmed byte-identical to the snapshot.
- **Documenter:** a fresh `impeccable-documenter` (agent af9c24ce6da77a93e, `opus`, medium).
  - Added "The Fluid Sheet Rule" and a paragraph on the chart's narrow form (switches below a measured 560px) to DESIGN.md Layout.
  - Added a `chart-narrow` breakpoint, the rule, and detector provenance to `.impeccable/design.json`; the JSON parses.
  - Remaining drift: `--ultra-soft` is declared but unused, as already recorded.
- **Final hashes (md5):**
  - Source: src/App.jsx d33ddc0dcb49f4b9249aafe70db5d049 (unchanged), src/styles.css 8662911db223657f9931c933848ac01c (was d395ba35dc43ee5c3784896fe16aabd1), index.html c80af3f80a8df8b2dc7aad5ac91beb93.
  - Dist: app.css 8650a46f4de35aaa88fc8adb3ad150c2 (was 889e221a692746d6bae0d24f1f8bc8ab), app.js 6b80a129597e810df0659ca9786b153d, data.js 18ec8e3bba4296b136276ed5d9b28ef2 (= public/data.js).
  - Docs: DESIGN.md b93c19127b5038367cf10eb6d57c4d71, design.json 2f70ae00dc69811668cc1ac507772bed.
  - Receipts: verdict-3.md 02a65de49508ce06de7f2168b158a6ad.
- **Limitations:**
  - The resize tests use Playwright `setViewportSize` in headless Chrome. They approximate dragging a real window, not an OS-level drag.
  - Sizes between the two viewports were only tested through the layout rules, not checked individually.
  - The parent's own screenshot and JSON were unavailable for comparison.
- **Cost:** this session used about $1.2 of its $3 cap, including both agent calls. The 6000-token soft target was again exceeded.

## Outcome
- Built: `src/App.jsx`, `src/styles.css` → `dist/` (index.html, app.js, app.css, unchanged data.js). `npm run build` and `npm run check` pass: no errors, no overflow at 1280x800 or 390x844.
- Design: location (native select, 14 locations), day (2-option segmented radio). Shows the noon height (m), rising/falling, next high and low (time, height, hours from noon), and a 24-hour SVG chart. The chart y-scale is computed from the selected samples, and you can scrub it by pointer or keyboard. Light only; no demo banners.

## Resource calls (exact outputs kept in `resource-log/`)
1. `./impeccable context` → NO_PRODUCT_MD, PRODUCT_INIT_REQUIRED, MANUAL_DETECTOR_REQUIRED, BUILD_PATH_DEFAULT: code, no image generation. (01)
2. `./impeccable concept-seed --help`: this was an **accidental** call. The flag was not recognized and the tool ran an unscoped surface roll, key aaa47392. I did not use its result. (02 rerun)
3. `./impeccable concept-seed --scope direction --mode operate` → key **b3a33188**, ASSIGNED INDEX **7**, six catalog challengers. (03)
4. `surface-brief read src/App.jsx` → exit 2, no output (no brief existed yet). `surface-brief write` → `.impeccable/surfaces/src-app-jsx.md`. I re-read it and confirmed all six contract blocks and the seed key. (04–06; rewritten for fix 2 in 08)
5. `./impeccable detect --json src/App.jsx src/styles.css dist/index.html` → `[]`. (07)
6. `./impeccable detect --json src/App.jsx src/styles.css dist/index.html` (continuation, before re-review) → two **advisory** `design-system-font-size` findings, styles.css:242/247, wordmark 32px/28px. These sizes were described in the DESIGN.md prose but missing from its frontmatter ramp. (09)
7. Same detect after the documenter sync → `[]`. (10)
8. No telemetry ping: no user choice was made, and IMPECCABLE_NO_TELEMETRY is set. No `build-phase` calls, since those apply only to comp-led builds. No `embed-prompt --scan`, because no rasters ship.

## Process
- **Init:** PRODUCT.md was written from USER_ANSWER.txt (Mike's real earlier answer, "Proceed as inferred"). No new interview was run or invented. No AskUserQuestion tool was available. Live mode was not configured, since this is a static prototype.
- **Candidates:** seven were persisted before the draw in `.impeccable/candidates.md`. Candidate 7, the 1960s surf-contest screenprint poster, was assigned.
- **Challenger verdicts (on audience fit and product clarity):**
  - Split-flap concourse: competitive (clarity).
  - Orienteering map, ticket wallet, Japanese high-density, streaming wall, centre-rail setting: declined.
  - Each declined challenger's discipline was added to the direction as a named line under RAISES in the contract.
  - My own pick (not presented): candidate 1, the tide booklet.
- **Direction round:** no decision page was served. Mike delegated design decisions, so the assigned direction was built. That is not recorded as a user approval.
- **Build path:** code-led, the recorded default; no image generation was available. craft-floor was read immediately before the UI edits.
- **Agents:** `impeccable-finish-reviewer`, run twice (full review, then a fresh verdict pass, because no continuation tool was available), and `impeccable-documenter`. Each ran on the `opus` model alias (claude-opus-5-5), with medium effort requested in the prompt, using only this run's packet.

## Finish review
- **Full review:** disposition **fix**, five material fixes (`.impeccable/finish/review.md`). All five were applied in one batch, then the app was rebuilt and recaptured.
- **Verdict pass:** all five fixes scored **resolved**. Disposition **fix**: one regression remains (event labels hard to read on the dimmed fill while scrubbing), plus an unidentified console 404 (`.impeccable/finish/verdict.md`, text written verbatim by me).
- **After the verdict (first session):** I changed scrubbing low labels to ink text with a white halo. That session ended before the reviewer could score it.
- **Verdict pass 2 (continuation, fresh `impeccable-finish-reviewer`, agent a13c99d4298ef8470, model `opus` = claude-opus-5-5, medium effort):** the scrub labels and the console 404 both scored **resolved**, with no regressions. Disposition **ship**. The reviewer wrote the receipt to `.impeccable/finish/verdict-2.md`. Its stated scope: the two open items on top of the five earlier fixes, not a fresh full-surface hunt.
- **Documenter (first session):** wrote `DESIGN.md` and `.impeccable/design.json`. Drift it reported: unused `--ultra-soft`, hard-coded `#fff`, and the appended scrub rule.

## Continuation (this session)
- **Rebuild and recapture:** rebuilt from the current source and recaptured every screenshot. New scrub captures: Half Moon Bay and Crescent City, at desktop and mobile. Before each hover the chart is scrolled into view, so the mobile captures show the plot. I inspected the captures myself, and the reviewer inspected them independently.
- **Label contrast:** measured from computed styles in the scrub state. Low labels are ink rgb(21,20,26) on a white halo, 18.31:1. High labels are ink on a stock halo, 17.98:1. A label next to the cursor hides on purpose, and the readout carries its value.
- **Console 404, request identity proven:** the QA server logged every path requested. The only path with no file in dist was `/favicon.ico`, the browser's automatic favicon request. Fix: `index.html` now has `<link rel="icon" href="data:,">`. After that, the requests are `/`, `/app.css`, `/data.js`, `/app.js`, and console errors are `[]`.
- **Documenter (fresh `impeccable-documenter`, agent a648fb495d060de8a, `opus`, medium):** synced DESIGN.md and design.json.
  - Added: the wordmark-stack (32px) and wordmark-narrow (28px) ramp steps, a direction step (28px), and "The Label Follows Its Ground Rule".
  - Recorded reviewer decisions.
  - Corrected the sidecar's chart-title size to 22px.
  - Drift still in the source: `--ultra-soft` is declared but unused (recorded as reserved), and literal `#fff` appears six times (recorded).
  - The documenter's own detector rerun was console-only. My saved rerun is resource-log/10.

## QA
- `evidence/qa/qa-matrix.cjs` → `qa-matrix.json` (final rerun after the docs sync): 112 checks (14 locations × 2 days × 2 viewports × file:// and HTTP), 0 failures, console errors `[]`. It also records server request paths and scrub-label contrast. Each check covers: initial state, height, trend, next high/low times and heights, the chart scale containing the data, event count, the noon marker, and overflow.
- Dataset unchanged: md5 of public/data.js = dist/data.js = 18ec8e3bba4296b136276ed5d9b28ef2. `npm run check`: no errors, no overflow.
- Screenshots: `evidence/qa/*-crescent-city-scrub.png` (new), `.impeccable/review/{desktop,mobile}.png`, `evidence/qa/*-scrub.png`, `*-crescent-city-*.png`, and `evidence/browser/` (from check).
- Two self-inspection rounds, then the reviewer rounds.

## Assumptions
- **Clock:** the readings are the supplied values at noon. "In N h" is the next event hour minus 12.
- **Hour 24:** shown as 12:00 midnight, with the next day's date where needed.
- **Chart floor:** it steps down to −0.5 m when a trough would otherwise leave no room for its label.
- **"Tides" wordmark:** product-free, no brand was invented.

## Limitations
- **Scope of the ship verdict:** the final verdict pass scored only the open items. The one full-surface review happened in the first round.
- **QA engine:** all QA ran in Chrome headless on macOS. No other browsers or OS fallbacks were tested.
- **System display font:** Avenir Next Condensed/Futura. The brief's system-fonts rule overrides craft-floor's self-hosted-face rule. Non-Apple fallbacks were not visually checked.
- **QUALITY BAR images:** catalog boards were not fetched (remote images). Challengers were judged from text.
- **Token target:** the 6000-token soft target was far exceeded, because the required resource references, reviews and documentation are large.
