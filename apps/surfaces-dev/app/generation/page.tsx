import QuickStartSurfacePage, { NextContextLinks } from '../_components/QuickStartSurfacePage';

const generationSnippet = `# 1) Start the adapter service
pnpm run adapter:serve-generation

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
      "colors":[{"value":"var(--background)","source":"generated.css"}]
    }]
  }'`;

export default function GenerationQuickStartPage() {
  return (
    <QuickStartSurfacePage
      activeTab="generation"
      contextLabel="Generation Quick Start"
      title="Run Contract Enforcement During AI UI Generation"
      summary="Use this flow when Lovable or Figma Make produces new UI and you want an immediate contract verdict before integration or release."
      steps={[
        {
          title: 'Start adapter service.',
          detail: 'Run the adapter once and keep it running while generating UI.'
        },
        {
          title: 'Build descriptor payload from generated output.',
          detail: 'Include surfaceId, emitted primitives, and every generated color value.'
        },
        {
          title: 'Send descriptor to the adapter endpoint.',
          detail: 'Use POST /surfaces.validateGeneration with tool, mode=descriptor, and descriptor array.'
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
      notes={[
        'Descriptor mode checks generation boundaries only (no full workspace validation).',
        'Use CI fallback later if your generator cannot hard-block inside its own UI.',
        'Canonical policy remains contracts/surfaces.web.contract.json.'
      ]}
      actions={
        <NextContextLinks
          left={{ href: '/integration', label: 'Integration Quick Start' }}
          right={{ href: '/runtime', label: 'Runtime Quick Start' }}
        />
      }
    />
  );
}
