# Tide — GPT-6.1 Sol Medium / NN/g UX

Complete. Working React app: `dist/index.html`. Open by file or serve `dist/` over local HTTP. Build: `npm run build`; initial-view QA: `npm run check`; exhaustive QA: `node evidence/verify.cjs`.

## Inputs and scope
Read BRIEF.txt, TECHNICAL.txt, POLICY.txt, USER_ANSWER.txt and resource/query-nngroup-ux/SKILL.md. Started from the empty supplied app; no sibling or prior designs read. Used only assigned NN/g tools and common shell/file/browser infrastructure. No additional skills, memory, agents, Git, external messages, or deployment. Durable outputs stayed inside this run folder.

## Actual resource calls and outcome
Exact request arguments and full returned results, document/section IDs, canonical URLs, authors, permission IDs, and returned SHA-256 hashes: `evidence/resource-calls.json`.

1. `nngroup_search`: keyword `visual hierarchy scanning information`, limit 4.
2. `nngroup_search`: keyword `dropdown selection many options`, limit 4.
3. `nngroup_get_section`: `nngroup:article:top-intranet-design-mistakes:s4:3-poor-visual-layout:97a4ce376afb`.
4. `nngroup_get_section`: `nngroup:article:dropdown-list:s10:too-many-options:021503116739`.
5. `nngroup_get_article`: `nngroup:article:dropdown-list` to inspect its outline and locate the small-option section.
6. `nngroup_get_section`: `nngroup:article:dropdown-list:s9:too-few-options:00a008312589`.

All succeeded. The intranet-layout section is supporting evidence for general hierarchy, not specialty tide advice. The dropdown sections directly address selection patterns. Other search matches were discovery-only and were not substantively relied upon.

## Corpus facts and design inferences
- Nielsen Norman Group, Kara Pernice, [The Top Enduring Intranet-Design Mistakes: 7 Deadly Sins](https://www.nngroup.com/articles/top-intranet-design-mistakes/), section “3. Poor Visual Layout”: type treatment, space and chunking affect hierarchy and scanning. **Inference:** emphasize current height, group next tides, then show the chart and full-day events. This is a general usability principle applied to coastal checking, not evidence of a tested tide layout.
- Nielsen Norman Group, Huei-Hsin Wang, [Does Your Form Really Need a Dropdown List?](https://www.nngroup.com/articles/dropdown-list/), section “Too Few Options”: exposing a handful of choices with radios avoids opening a menu to discover them. **Inference:** show both dates as native radios with visible selected and focused states.
- Same article, section “Too Many Options”: roughly more than 15 choices creates scan/scroll cost; filtering can help larger predictable sets. **Inference:** a labeled native select with 14 alphabetized locations is a reasonable bounded prototype choice. The section does not specifically endorse 14-option selects. Native type-to-select and OS selection UI are retained; a search combobox would merit evaluation if this list grows.

Fetched section hashes respectively: `97a4ce376afbd2e945010f26ed6b3f60c71d63caa5be517a7a51639b868b87dc`, `00a0083125898d0e5afe732327db131203031c124ba5d16180e0019a4d5bbefc`, `021503116739d917f381a5d593d268e9f6d44b1ab46948ccbdedac015a2ea5bc`. Exact source text is preserved in local evidence for audit; none appears in the app.

## Verification
- Final `npm run build` and `npm run check` passed. No browser runtime errors, no horizontal overflow at 1280×800 or 390×844.
- `evidence/functional-qa.json`: 112 passing combinations = 14 locations × 2 dates × 2 viewports × 2 load modes (file and HTTP).
- Each combination checks current height, rising/falling text, next high/low time and height, selected location/date chart identity, exact 25-point path geometry from supplied samples, chart bounds containing every height, and horizontal overflow.
- Keyboard checked in all four mode/viewport pairs: Tab enters native location select, arrow selection works, Tab reaches day radio, arrow switches day, and visible focus outline is present.
- Light-only presentation checked with emulated dark system preference.
- Actual screenshots inspected for desktop, mobile, and mobile keyboard focus. Initial current reading, controls, next tides, chart and units are readable. Supplemental event list continues below the mobile fold; no overlapping labels or clipped chart. Final screenshots: `evidence/browser/desktop.png`, `mobile.png`, `file-1280-keyboard.png`, `file-390-keyboard.png`, `http-1280-keyboard.png`, `http-390-keyboard.png`.
- First check found the fixture is a global lexical constant, not a window property; fixed that binding. Exhaustive QA caught its own midnight assumption and CSS serialization assumption. Midnight next tides are now labeled “Next day”; final verification passed after correction.

Fixture preserved: public/data.js and dist/data.js both SHA-256 `6e8804d88335cdf2ad2a968b61edfd53b9f4792102f482459fa9500d9d741d5f`.

## Assumptions and limitations
The supplied noon clock remains fixed on the selected date. Dates use Pacific-time labels and explicit year. Chart uses straight interpolation between hourly samples and recalculates its scale for each selection; comparisons across selections therefore use different scales. Native SVG description exposes every hourly value; manual screen-reader and user testing were not performed. No live APIs or safety claims. Visual colors and arrangement are delegated design inferences. The 6000 processed-token soft target was exceeded during full evidence capture and exhaustive QA; exact usage telemetry is unavailable in this run. Required gates were completed.
