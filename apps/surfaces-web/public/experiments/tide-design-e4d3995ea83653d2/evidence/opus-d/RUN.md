Status: complete

# Tide prototype — run opus-d (baseline, resource: none)

## Outcome
Single-screen responsive React 19 tide app built from the fresh starter and unchanged `public/data.js` (14 locations × 2 dates).
- Controls: location `<select>` (14 stations) and a two-button day toggle (Tue Oct 6 / Wed Oct 7). Initial selection: Half Moon Bay, 2026-10-06.
- Reading card: station, full date and "at 12:00 PM PT" clock, current height (m), Rising/Falling (arrow + word + colour), next high and next low (time PT + height), ordered by which comes first.
- 24-hour chart (inline SVG): smooth curve through all 25 hourly samples (0–24 h), metre gridlines, labelled hour axis, H/L event markers with heights, dashed noon marker with current height. Y scale is computed per selection (0 to rounded-up max with headroom, 0.5 m or 1 m steps) so it always contains the data. Mobile uses a narrower chart geometry so labels stay legible. Event list under the chart; SVG has a text `aria-label` summary.
- Light mode only (`color-scheme: only light`, no dark media rules); system fonts; no banners/notices; no network calls.
- Files changed: `src/App.jsx`, `src/styles.css`. Added QA script `evidence/sweep.cjs`. Starter build/check/data unchanged.

## Resource calls
None. Baseline condition: no skills, MCP servers (mcp.json empty), plugins, agents, or design resources used. Only file/shell tools and the supplied Playwright/Chrome check infrastructure.

## QA
- `npm run build` — success. `npm run check` — `{"errors":[],"viewports":[{"viewport":"desktop","overflow":false},{"viewport":"mobile","overflow":false}]}`; screenshots in `evidence/browser/desktop.png`, `mobile.png`; output in `qa.json`.
- `node evidence/sweep.cjs` — all 28 location/day combinations at desktop 1280×800 over **local HTTP** and mobile 390×844 over **file://** (56 checks): initial-state check, displayed station/height/trend/next-high/next-low time+height match data, curve inside gridline range, no horizontal overflow, no page errors. Final result: `{"combos":56,"fails":[],"errs":[]}` (`evidence/sweep.json`).
- Issues found and fixed during QA: (1) Fort Bragg (max 3.2 m) curve rose above the top gridline — tick rounding fixed; (2) near-zero low labels (Crescent City 0.24 m) collided with the time axis — labels now lifted above the dot with a white halo; (3) mobile chart text was too small and "m" overlapped the top tick — added narrow chart geometry and repositioned unit label.
- Visual review of desktop and mobile screenshots (Half Moon Bay Oct 6; Crescent City Oct 7).

## Assumptions
- Readings shown are the supplied `currentHeight`, `trend`, `nextHigh`, `nextLow`, `events` values, not recomputed; chart uses the supplied hourly samples (curve smoothing between samples is visual only).
- "Next" high/low as supplied may fall at hour 24; shown as "12:00 AM (next day)".
- Persistent user answer ("Proceed as inferred"): general coastal-outing user, no activity prioritized, no safety claims, no extra brand/accessibility standard. No new human question needed; no QUESTION.md written.

## Limitations
- Prototype only: two fixed dates, fixed noon clock, fixture data (not for navigation or safety).
- Chart interaction is static (no hover/scrub readout).
- Soft target of ~6000 processed tokens was exceeded (reading inputs, building, three QA iterations with screenshots); recorded as an overrun.
