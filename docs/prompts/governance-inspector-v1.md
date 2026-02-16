# Governance Inspector V1 Prompt

Build a NEW SurfaceOps governance inspector view from scratch (do not refactor existing prototype UI).

Goal:
- The page is edge-to-edge and viewport-filling within bounds: min 1100x700, max width 1920.
- The main focus is a large live surface preview canvas.
- A resizable right panel contains categorized contract violations.
- Clicking a violation highlights and labels violating elements in the preview.
- Clicking/selecting an element in preview highlights the linked violation(s) in the right panel.
- Use progressive disclosure: show only information necessary for current task.

Scope:
- Default to a neutral reference target profile (`reference_customer_v1`) in v1.
- Keep BYO URL support with explicit degraded reliability messaging.
- Implement as a new route under `/contracts/governance`.
- Keep existing governance prototype routes untouched.
- Keep existing persistence APIs; do not change persistence schemas.

Technical requirements:
- Add preview telemetry protocol (`postMessage`) between inspector parent and preview iframe.
- Add client-side element-level violation checker in inspector.
- Add overlay/highlight labels inside preview.
- Add categorized violations list with drag-resizable panel (persist width).
- Support URL state for prototype, snapshot, route, selected violation, selected element.
- Include URL state for `targetMode=reference|byo` and `targetProfile`.

UX constraints:
- No top metadata dump.
- No always-visible full data model panels.
- Contract JSON/structured details remain secondary (drawer or detail toggle).
- Follow usability heuristics: progressive disclosure, recognition over recall, clear disabled reasons.

Acceptance:
- Bidirectional selection works reliably.
- Violations are categorized and synchronized with canvas highlights.
- Reliability tier is visible (`full` vs `degraded`) with explicit reasons in BYO mode.
- Layout is stable and responsive within constraints.
- Existing `/contracts` and `/contracts/runs` flows remain unaffected.
