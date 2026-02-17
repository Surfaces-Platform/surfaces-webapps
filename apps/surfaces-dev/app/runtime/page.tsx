import QuickStartSurfacePage, { NextContextLinks } from '../_components/QuickStartSurfacePage';

const runtimeSnippet = `# 1) Build runtime manifest from canonical contract
pnpm run generate:runtime-manifest

# 2) Propose a runtime style change (expected strict violation)
curl -i -H "x-proposed-bg: rgba(15, 23, 42, 0.45)" \\
  "http://localhost:3000/adaptive/test?section=hero"

# 3) Example allow path
curl -i -H "x-proposed-bg: var(--background)" \\
  "http://localhost:3000/adaptive/test?section=hero"`;

export default function RuntimeQuickStartPage() {
  return (
    <QuickStartSurfacePage
      activeTab="runtime"
      contextLabel="Runtime Quick Start"
      title="Enforce Contract Policy At Runtime"
      summary="Use runtime checks to block strict violations in live adaptive flows while still reporting warning-level diagnostics for review and cleanup."
      steps={[
        {
          title: 'Generate runtime manifest.',
          detail: 'Build per-surface runtime policy from the canonical contract before running runtime checks.'
        },
        {
          title: 'Validate proposed runtime changes.',
          detail: 'Pass proposed styles through runtime validation before applying them.'
        },
        {
          title: 'Block strict violations.',
          detail: 'Return 422 when strict color/raw policy or other strict rules fail.'
        },
        {
          title: 'Allow warning-level events with visibility.',
          detail: 'Capture warnings (for example token namespace mismatch) without blocking traffic.'
        },
        {
          title: 'Include contract provenance in violation payloads.',
          detail: 'Return contractId, version, and surfaceId for each runtime decision.'
        }
      ]}
      snippetTitle="Runtime Verification Commands"
      snippet={runtimeSnippet}
      notes={[
        'Runtime should block strict-policy findings only.',
        'Warn findings remain visible for remediation and policy hygiene.',
        'Runtime checks complement generation + integration checks, not replace them.'
      ]}
      actions={
        <NextContextLinks
          left={{ href: '/generation', label: 'Generation Quick Start' }}
          right={{ href: '/integration', label: 'Integration Quick Start' }}
        />
      }
    />
  );
}
