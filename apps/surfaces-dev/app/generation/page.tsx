import { ContextLinkCard } from '../_components/DocsSurfaceShell';
import QuickStartSurfacePage, { NextContextLinks } from '../_components/QuickStartSurfacePage';
import { interfacectlGenerationReferenceCards } from '../../../_shared/interfacectl-doc-links.js';

const generationSnippet = `# 1) Start the adapter service (reference-target contract)
pnpm run adapter:serve-generation -- \\
  --contract /Users/mike/SurfacesPlatform/surfaces-webapps/contracts/generated/reference-target-web.contract.json

# 2) Submit generated descriptor output
curl -sS -X POST http://127.0.0.1:7777/surfaces.validateGeneration \\
  -H 'content-type: application/json' \\
  -d '{
    "requestId":"gen-001",
    "tool":"figma-make",
    "surfaceId":"reference-target-web",
    "mode":"descriptor",
    "descriptor":[{
      "surfaceId":"reference-target-web",
      "primitives":[],
      "colors":[{"value":"var(--background)","source":"generated.css"}],
      "icons":[{"value":"@heroicons/react/24/outline","source":"generated.tsx"}]
    }]
  }'`;

export default function GenerationQuickStartPage() {
  return (
    <QuickStartSurfacePage
      activeTab="generation"
      contextLabel="Generation Quick Start"
      title="Run Contract Enforcement During AI UI Generation"
      summary="Use this repo-level Generation time workflow when Lovable or Figma Make produces new UI and you want immediate policy visibility before CI/CD time promotion. It is built on interfacectl, not a replacement for the canonical tooling docs."
      steps={[
        {
          title: 'Start adapter service.',
          detail: 'Run the adapter once and keep it running while generating UI.'
        },
        {
          title: 'Build descriptor payload from generated output.',
          detail: 'Include surfaceId, emitted primitives, generated color values, and icon import sources.'
        },
        {
          title: 'Send descriptor to the adapter endpoint.',
          detail: 'Use POST /surfaces.validateGeneration with tool, mode=descriptor, and descriptor array.'
        },
        {
          title: 'Apply phased descriptor parity.',
          detail: 'Descriptor mode enforces shell + color + icon policy for rollout-enabled surfaces (`contracts/generation-descriptor-parity.json`).'
        },
        {
          title: 'Read status and findings.',
          detail: 'pass continues, warn continues with visibility, block stops and requires regeneration/fix.'
        },
        {
          title: 'Repeat until status is pass or acceptable warn.',
          detail: 'Treat block as a hard stop for publish/export decisions.'
        }
      ]}
      snippetTitle="Copy/Paste Start"
      snippet={generationSnippet}
      referenceCards={interfacectlGenerationReferenceCards}
      notes={[
        'Descriptor mode checks generation boundaries only (no full workspace validation).',
        'Descriptor parity is phased by surface; initial enforcement starts with reference-target-web.',
        'For non-enforced surfaces, keep CI fallback as the authoritative promotion gate.',
        'Use CI fallback later if your generator cannot hard-block inside its own UI.',
        'Use the contract for your target surface: contracts/generated/reference-target-web.contract.json for reference-target demos, contracts/surfaces.web.contract.json for canonical surfaces.'
      ]}
      actions={
        <div className="space-y-3">
          <ContextLinkCard
            href="/guides/marketing-profile"
            eyebrow="Read guide"
            label="What marketing profiles do during first contract generation"
          />
          <NextContextLinks
            left={{ href: '/integration', label: 'Integration Quick Start' }}
            right={{ href: '/runtime', label: 'Runtime Quick Start' }}
          />
        </div>
      }
    />
  );
}
