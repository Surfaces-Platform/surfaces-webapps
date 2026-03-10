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
      summary="Use this Runtime (edge) flow to block strict live adaptive violations while still reporting warning-level diagnostics for review and cleanup."
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
          title: 'Keep icon policy enforcement at earlier lifecycle points.',
          detail: 'Icon-source policy is not enforced at Runtime (edge) in this increment; rely on Generation time + CI/CD time checks.'
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
        'Runtime checks complement Generation time + CI/CD time checks, not replace them.',
        'Icon-source policy (`icon.source-disallowed`) is currently visible in integration/CI validation paths, not Runtime (edge).',
        'Concrete consumer example walkthrough: `ios/ContractChatSample/README.md`.'
      ]}
      detailSections={[
        {
          title: 'Consumer Runtime Example: ContractChatSample',
          intro:
            'The platform/web flow above is request-time enforcement of proposed live changes. `ContractChatSample` is a client-side consumer example where the app gates streamed content before rendering. It is testing local runtime orchestration and UI-state transitions, not model quality.',
          items: [
            {
              label: '`CoreMLStubRuntime`',
              text: 'emits token-sized events into an async stream.'
            },
            {
              label: '`ChatViewModel`',
              text: 'consumes the stream and owns transcript, footer, and cancellation state.'
            },
            {
              label: '`StreamingContractValidator`',
              text: 'accepts, buffers, replaces, or rejects each chunk before it reaches the renderer.'
            },
            {
              label: 'Render rule',
              text: 'only approved text is appended to the UIKit assistant transcript.'
            }
          ]
        },
        {
          title: 'ContractChatSample Event Sequence',
          intro:
            'This sample makes the runtime decision path visible in three small UI scenarios.',
          ordered: true,
          items: [
            {
              label: '`Send`',
              text: 'Prompt submitted, chunks emitted, validator approves, assistant bubble updates incrementally, footer ends at `Complete`.'
            },
            {
              label: '`Cancel`',
              text: 'Prompt submitted, footer reaches `Streaming`, cancel tapped, cancellation becomes authoritative, late completion is ignored, footer ends at `Cancelled`.'
            },
            {
              label: '`Blocked`',
              text: 'Safe text renders first, a prohibited chunk is rejected, a governance/status row appears, the rejected text never renders, and the footer ends at `Complete`.'
            }
          ]
        }
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
