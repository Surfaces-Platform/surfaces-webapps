# GPT-D tide app

Completed the independent GPT-6.1 Sol / Medium condition with no design resource. The empty React 19 / esbuild starter now builds a working, light-only tide app for all 14 supplied locations and both days.

## Output

- Final entry: [Open the final app](../../gpt-d/index.html)
- Source: `src/App.jsx`, `src/styles.css`; unchanged starter build and check scripts.
- Functional test script and receipt: `evidence/functional.cjs`, `evidence/functional.json`.
- Final screenshots: `evidence/browser/file-desktop.png`, `file-mobile.png`, `http-desktop.png`, `http-mobile.png`.
- Supplied check receipt: `qa.json`; screenshots `evidence/browser/desktop.png`, `mobile.png`.

Open the final entry directly by file URL, or serve the dist folder using any static localhost HTTP server. JavaScript, CSS and data are local relative assets. No API, remote font or downloaded asset is used.

## Product and design decisions

Used BRIEF.txt, TECHNICAL.txt, POLICY.txt and USER_ANSWER.txt as the sole requirements and product context. No additional human clarification was needed. Designed a quiet pale-green page with a large location heading, native location/day selectors, a prominent noon reading, next low/high tide cards, and a 24-hour chart. Each selected day retains the fixed noon clock. Units are metres and times are Pacific. Midnight at hour 24 explicitly says `(+1 day)` in tide readings and hourly data. The chart joins supplied hourly values with straight segments; it does not invent interpolated predictions. All high/low events appear below the chart, with an expandable hourly table as a text alternative. No demo notice or banner is present.

## Verification

Final `npm run build` and `npm run check` passed. Supplied check recorded no page errors and no horizontal overflow at 1280×800 and 390×844.

`node evidence/functional.cjs` passed 112 cases: 14 locations × 2 dates × 2 viewports × 2 transports (file and localhost HTTP). For every case it checked location heading, selected current height, rising/falling text, next high/low time and height, event times, exact source samples, exact chart point coordinates against the selected values, and scale containment. The chart range updates from the selected day's samples. Every case also checked horizontal overflow. Both file and HTTP starts retain Half Moon Bay / October 6.

Keyboard focus traversed brand, Location, Day, and hourly-details summary, with a solid visible outline. Enter opens the hourly table and all 25 sample rows exist. The light-only computed CSS state was checked after emulating a dark system preference. No browser runtime errors occurred. The original local receipt records HTTP requests and the ephemeral test-server URL; the server was closed afterward.

Final desktop document height is 800 pixels at 1280×800. Mobile is 1088 pixels at 390×844 and scrolls vertically; horizontal overflow is absent. Actual final desktop and mobile screenshots were opened and visually inspected after the final build. The plot labels, noon marker, readings and controls remain legible. Desktop styling was compacted after initial screenshot review to fit the 800-pixel viewport.

## Data integrity

Both `public/data.js` and built `dist/data.js` SHA-256:

`6e8804d88335cdf2ad2a968b61edfd53b9f4792102f482459fa9500d9d741d5f`

This exactly matches STARTER-MANIFEST.json. The fixture was not modified.

## Calls, outcomes and limitations

Resource calls: **zero**. No skills, design MCP, plugins, memory, siblings, earlier experiments, git, external messages, deployment or gallery/report edits. Common infrastructure only: shell file reads/writes, npm/esbuild, supplied Playwright import, installed Google Chrome, node VM/HTTP, and local screenshot viewing. All writes were confined to this assigned run. Browser/build writes used authorized sandbox escalation for the local directory. An un-escalated diagnostic Chrome launch failed with sandbox EPERM; subsequent authorized launches succeeded.

The functional script initially used an incorrect assumption about macOS headless native-select arrow behavior; arrow-key selection did not change its value, so that unsupported assertion was removed. Keyboard focus and summary activation remain verified; all selection-driven updates are verified using Playwright selectOption. Chrome canonicalizes `only light` as `light only`; the test was corrected to accept both equivalent values. No product change was needed for those test corrections.

Limitations: verified in installed Chromium only, without an independent screen-reader audit. Native popup selection via arrow keys is not claimed as verified. The supplied fixture provides two dates and a noon clock only; the app does not calculate live tides or give activity/safety advice. Mobile uses ordinary vertical scrolling on the single page. Exact processed-token telemetry is unavailable to this worker; the soft 6000-token target is conservatively treated as exceeded, and no low-token claim is made.
