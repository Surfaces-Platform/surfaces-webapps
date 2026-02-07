# interfacectl Examples

Dogfood-ready snippets that show contract enforcement outside the Surfaces apps. Keep them small and runnable.

## Edge
- `edge/manifest.json`: trimmed per-surface manifest (derived from the main contract).
- `edge/validate-edge.js`: minimal validator for adaptive style changes.
- Quick run: `node docs/interfacectl/examples/edge/validate-edge.js` (prints allow/violations).
- `edge/edge-middleware.ts`: example Next.js Edge Middleware wiring using the validator.

## UI (raw color example)
- `ui/raw-color.tsx`: intentional raw color violation.
- `ui/fixed-color.tsx`: token-based fix.
- `ui/README.md`: how to use in a page and see validate:local fail → pass.

## Planned
- Next.js sample page with contract container + validation script.
- Serverless function wiring the edge validator.
- React Native mock demonstrating raw-color check.
