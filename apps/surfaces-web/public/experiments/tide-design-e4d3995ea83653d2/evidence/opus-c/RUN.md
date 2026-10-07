Status: complete

# Tide prototype — run opus-c (NN/g UX resource)

## Outcome
- One-screen responsive tide app in `src/App.jsx` + `src/styles.css`, built to `dist/` (`index.html`, `app.js`, `app.css`, unchanged `data.js`).
- Controls: location `<select>` (14 stations, alphabetical) and a two-button day toggle (Tue Oct 6 / Wed Oct 7). Initial: Half Moon Bay, 2026-10-06.
- Readings: noon height in large type with a Rising/Falling pill; next high and next low cards (time, height, hours from noon), sorted by which comes first; 24-hour SVG line chart with a labelled metre axis, 3-hour time ticks (6-hour ticks on narrow screens), a noon marker, and value labels on each high and low; a collapsible table of hourly heights.
- Units, timezone and clock are stated in the header ("Heights in metres (m) · Times in Pacific Daylight Time (PDT)"), in the reading line ("as of 12:00 PM (noon) PDT"), and in the chart subtitle.
- All values come straight from `public/data.js` (currentHeight, trend, nextHigh, nextLow, events, samples). Nothing is calculated except the chart scale and time formatting.
- Light mode only. No demo banner. No live APIs and no web fonts.

## Resource calls (query-nngroup-ux skill + local nngroup-ux MCP, keyword mode only)
The exact requests and the returned identities, scores and hashes are in `evidence/resource/calls.json`. Concepts I translated the request into: chart readability and scale (axes and labels), choosing from a 14-item location list, and reading the key reading at a glance.

| # | Call | Request | Outcome |
|---|------|---------|---------|
| 1 | nngroup_search | `line chart axis labels readability` (keyword, limit 6) | 6 results. Direct: clutter-charts/Axes, infographics/Informational Honesty. Supporting: dashboards-preattentive/Linear vs. Area-Based. The rest were incidental. |
| 2 | nngroup_search | `dropdown menu long list options` (keyword, limit 6) | 5 results. Direct: dropdown-list/Too Many Options. |
| 3 | nngroup_search | `dashboard glanceable key information` (keyword, limit 6) | 6 results. Direct: glanceable-fonts/Applying These Findings. |
| 4 | nngroup_get_section | `nngroup:article:clutter-charts:s4:axes:4a0348dd4487` | ok, hash 4a0348dd…fdd8c8 |
| 5 | nngroup_get_section | `nngroup:article:dropdown-list:s10:too-many-options:021503116739` | ok, hash 02150311…2ea5bc |
| 6 | nngroup_get_section | `nngroup:article:designing-effective-infographics:s3:informational-honesty:76c291ed6779` | ok, hash 76c291ed…87131f |
| 7 | nngroup_get_section | `nngroup:article:glanceable-fonts:s4:applying-these-findings-to-your-designs:32e96dd18f74` | ok, hash 32e96dd1…c1e31e1a9 |
| 8 | nngroup_get_section | `nngroup:article:dashboards-preattentive:s4:linear-vs-area-based-graphs:a466e325a264` | ok, hash a466e325…5309e4 |

I made no nngroup_get_article calls because no outline or relationship between sections affected a decision. Search is lexical, not semantic.

## Evidence applied (corpus claim → my decision)
- **Corpus:** Data labels make exact values easy to read. Axes and grid lines are worth keeping when the general magnitude matters. (Kate Moran, "Clutter-Free: One of the 3 Cs for Better Charts", https://www.nngroup.com/articles/clutter-charts/, section "Axes".)
  **Inference/decision:** Keep light grid lines and a metre y-axis so the overall tide shape and range are readable. Add exact value labels only on highs and lows, which are the values people look for.
- **Corpus:** Scale charts to show the range of values accurately. A zero baseline is natural in many cases, but you don't have to force it when another logical baseline exists. (Lexie Kane, "Designing Effective Infographics", https://www.nngroup.com/articles/designing-effective-infographics/, section "Informational Honesty".)
  **Decision:** The y-axis starts at 0 m, which is the fixture's natural baseline because every height is positive. The top is the selected day's maximum plus at least 0.2 m, rounded up to 0.5 m. The scale changes with each selection and always contains the data.
- **Corpus:** 2D position, as used in line graphs, is a preattentive attribute and supports quick comparisons. (Page Laubheimer, "Dashboards: Making Charts and Graphs Easier to Understand", https://www.nngroup.com/articles/dashboards-preattentive/, section "Linear vs. Area-Based Graphs".)
  **Decision:** Use a line chart. The light fill under the line is decorative, and values are read from the line's position.
- **Corpus:** Dropdowns become a problem above roughly 15 options. In that case a filterable combobox helps. (Huei-Hsin Wang, "Does Your Form Really Need a Dropdown List?", https://www.nngroup.com/articles/dropdown-list/, section "Too Many Options".)
  **Inference/decision:** At 14 locations the list is under that threshold, so I used a native `<select>`, sorted alphabetically to make scanning easier (my inference). With only two dates, a visible two-button toggle replaces a second dropdown (my inference).
- **Corpus:** Use larger font sizes for glanceable information, and avoid condensed or thin type for people who are distracted. (Page Laubheimer, "Typography for Glanceable Reading: Bigger Is Better", https://www.nngroup.com/articles/glanceable-fonts/, section "Applying These Findings to Your Designs".)
  **Decision:** The current height is about 3.4rem bold system UI type. The trend and next-tide times are bold and 1.25–1.5rem. Someone checking tides on the way to the coast may be distracted (my inference about context).
- None of these sources is specific to tides or to accessibility. They support general chart, form and typography principles only.

## QA
- `npm run build`: passed. `npm run check`: `{"errors":[],"viewports":[{"viewport":"desktop","overflow":false},{"viewport":"mobile","overflow":false}]}`. Screenshots are in `evidence/browser/`.
- `evidence/qa/sweep.cjs` checked all 14 locations × 2 days = 28 combinations in each of two passes, for 56 checks total:
  - Desktop 1280×800 over local HTTP (127.0.0.1:8765).
  - Mobile 390×844 over `file://`.

  For each combination it confirmed that the station name, noon height, trend, next-high and next-low heights match the data; that the chart line stays inside the SVG viewBox; and that every high/low height appears in the chart's accessible label. It also checked the initial selection, horizontal overflow, page errors and failed requests. Result: `{"checked":56,"fails":0,"errors":[]}` (`evidence/qa/sweep.json`). The Point Reyes, Oct 7 screenshots for both passes are in `evidence/qa/`.
- Visual review of the screenshots found two problems, both fixed:
  - Mobile chart labels were too small because the SVG scaled down. Fix: the chart now uses a narrower drawing at ≤560px.
  - A low-tide label at noon collided with the noon marker. Fix: that label is now offset.

## Assumptions
- Product scope comes from USER_ANSWER.txt ("Proceed as inferred"): someone checking tides for a coastal outing, with no particular activity prioritized. No safety claims and no accounts.
- "Pacific time" on Oct 6–7, 2026 is PDT (UTC−7). Daylight saving time ends Nov 1, 2026.
- Fixture hour 24 is midnight starting the next day. It is shown as, for example, "12:00 AM, Thu, Oct 8".
- The data's `trend` and `nextHigh`/`nextLow` are shown exactly as supplied. For example, Point Reyes on Oct 7 is "Rising" at a 0.44 m low at noon. I did not re-derive them.
- The tidal datum isn't specified in the data, so no datum is claimed. The `demo: true` flag is not shown, per the no-banner instruction.

## Limitations
- The chart connects hourly samples with straight segments, so peaks between samples are not interpolated.
- This run is condition c, so no finish-role agents were used (they are available only in condition b). No new human question came up, and there is no QUESTION.md.
- The resource log keeps exact requests plus returned identities, hashes and scores. It does not store the full verbatim search excerpts or section texts; the section content is paraphrased above.
- Processed tokens went well over the soft target of 6,000. The data inspection, eight MCP replies (about 15k tokens) and screenshot review account for most of that.
- The QA was automated plus screenshot review. No assistive-technology or real-user testing was done.
