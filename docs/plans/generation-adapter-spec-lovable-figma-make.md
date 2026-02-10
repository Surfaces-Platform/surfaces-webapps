# Generation Adapter Spec: Lovable + Figma Make

## Purpose
Define a concrete adapter contract so Surfaces can enforce interface policy at generation time when users work in Lovable or Figma Make.

This spec focuses on **decision-time blocking semantics** for generated proposals and aligns with the strategy rule: no enforcement-free pathways.

## Scope
In scope:
- Generation-time validation adapter API
- Shared verdict schema (`pass|warn|block`)
- Integration patterns for Lovable and Figma Make
- UI behavior for findings and retry loops
- Rollout and acceptance criteria

Out of scope:
- Changing interfacectl schema or rule semantics
- Runtime telemetry design
- In-product ownership workflows (assign/ack/mute)

## Canonical Inputs and Dependencies
- Contract: `contracts/surfaces.web.contract.json`
- CLI validator: `tools/interfacectl/packages/interfacectl-cli/dist/index.js`
- Generation boundary checker: `tools/interfacectl/tools/check-generation-boundaries.mjs`
- Optional operations view: SurfaceOps routes under `/contracts/runs`

## System Model
1. Generator produces proposal (code, diff, or generated artifacts).
2. Adapter normalizes proposal into a Surfaces-compatible payload.
3. Adapter runs generation gate checks.
4. Adapter returns deterministic verdict + findings.
5. Host UI (Lovable/Figma Make flow) enforces publish behavior from verdict.

## Adapter API (Normative)

### Request
```json
{
  "requestId": "uuid",
  "tool": "lovable|figma-make",
  "surfaceId": "surfaces-web",
  "proposal": {
    "type": "files|diff|descriptor",
    "files": [
      {
        "path": "apps/surfaces-web/app/page.tsx",
        "content": "..."
      }
    ],
    "descriptor": [
      {
        "surfaceId": "surfaces-web",
        "primitives": [
          { "role": "navigation", "count": 1, "sources": ["generated/page.tsx"] }
        ]
      }
    ]
  },
  "provenance": {
    "sessionId": "string",
    "userId": "string",
    "timestamp": "2026-02-09T00:00:00Z"
  }
}
```

### Response
```json
{
  "requestId": "uuid",
  "status": "pass|warn|block",
  "surfaceId": "surfaces-web",
  "contract": {
    "id": "surfaces.web",
    "version": "0.1.0"
  },
  "findings": [
    {
      "code": "shell-owned-primitive-emitted",
      "severity": "error|warn",
      "policy": "strict|warn|off",
      "message": "Navigation is shell-owned for this surface.",
      "location": {
        "file": "apps/surfaces-web/app/page.tsx",
        "line": 42
      },
      "evidence": {
        "role": "navigation",
        "source": "generated/page.tsx"
      },
      "nextAction": "Remove generated navigation and rely on shell-owned source."
    }
  ],
  "timings": {
    "totalMs": 123
  }
}
```

## Verdict Semantics
- `pass`: no blocking findings; publish/export enabled.
- `warn`: warnings only; publish/export enabled, warnings visible.
- `block`: at least one strict/error finding; publish/export disabled.

Mapping rule:
- Any finding with `policy=strict` or `severity=error` => `block`.
- Otherwise if findings exist => `warn`.
- No findings => `pass`.

## Validation Pipeline (Normative Order)
1. `check-generation-boundaries` against descriptor primitives.
2. `interfacectl validate` against normalized generated output.
3. Optional `validate-extracted` when extraction artifact is available for the surface.

First blocking failure may short-circuit for latency, but response must still include normalized findings list.

## Host UI Contract

### Required user-visible states
1. Pass state: "Compliant. Ready to publish."
2. Warn state: "Warnings detected. You can publish or revise."
3. Block state: "Blocked by contract. Fix required before publish."

### Required controls
- `Regenerate with constraints`
- `View findings`
- `Copy technical details` (for engineering handoff)

### Required behavior
- Disable publish/export button on `block`.
- Keep generated output editable and allow retry.
- Preserve the last verdict for the session.

## Lovable Integration Pattern
- Use Lovable custom MCP connector to call adapter tools.
- On each generation completion, call `surfaces.validateGeneration`.
- Render findings in Lovable panel and gate finalize/publish action based on status.
- If hard publish hook is unavailable in-host, enforce hard gate at Git sync/CI boundary with same verdict schema.

## Figma Make Integration Pattern
- Use Figma MCP flow to fetch Make resources for the generation context.
- Normalize fetched artifacts into adapter request payload.
- Call `surfaces.validateGeneration` and return verdict to user flow.
- Use Code Connect mappings where available to improve component-level attribution in findings.
- If host cannot hard-block publish in-flow, require CI gate before promotion to deployable branch.

## Finding Code Baseline (Initial)
Required v1 codes to handle explicitly:
- `shell-owned-primitive-emitted`
- `sections.required`
- `color.rawValues`
- `phase0.authPosture.mismatch`
- `phase0.authRoutes.missing`

Unknown future codes must still render as actionable findings using generic fallback text.

## Reliability and Performance
- Target p95 adapter latency: <= 1500ms for proposals under 200 files.
- Timeout behavior: fail closed (`block`) with `code=adapter.timeout` for production gates.
- Determinism: same input + same contract version => same verdict.

## Security and Privacy
- Never log raw secrets from generated files.
- Redact auth tokens and credentials before persistence.
- Retain only minimum payload needed for findings and traceability.

## Rollout Plan
1. Phase A (advisory): show verdicts; do not hard-block publish in-host.
2. Phase B (partial gate): hard-block on shell ownership + required sections.
3. Phase C (full gate): all strict policy findings block publish/promotion.
4. Phase D (ops loop): stream verdict summaries into SurfaceOps runs view.

## Acceptance Criteria
1. Same proposal evaluated through Lovable and Figma Make adapters returns identical verdict and finding codes.
2. Blocked proposals cannot be promoted without remediation.
3. Adapter responses are stable JSON and include `requestId`, `status`, and `findings`.
4. UI exposes clear recovery path (`Regenerate with constraints`) for every blocked proposal.
5. SurfaceOps can display latest generation verdict summary for each surface.

## Open Decisions (Track Separately)
1. Whether host platforms can enforce in-product hard publish disable natively, or require external promotion gates.
2. Exact persistence model for proposal artifacts and verdict history.
3. Whether to add deterministic auto-fix suggestions for selected finding codes in v1.
