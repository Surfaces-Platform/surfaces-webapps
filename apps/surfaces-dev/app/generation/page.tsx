import { ContextLinkCard } from '../_components/DocsSurfaceShell';
import QuickStartSurfacePage, { NextContextLinks } from '../_components/QuickStartSurfacePage';

const generationSnippet = `# 1) Compile the contract into a generation bundle
node scripts/interfacectl-tool.mjs run cli compile \\
  --contract /Users/mike/SurfacesPlatform/surfaces-webapps/contracts/surfaces.web.contract.json \\
  --out /Users/mike/SurfacesPlatform/surfaces-webapps/artifacts/generation-bundles/surfaces-web

# 2) Resolve one surface into an agent-ready payload
node scripts/interfacectl-tool.mjs run cli prepare-generation \\
  --bundle-root /Users/mike/SurfacesPlatform/surfaces-webapps/artifacts/generation-bundles/surfaces-web \\
  --surface surfaces-web \\
  --out /Users/mike/SurfacesPlatform/surfaces-webapps/artifacts/generation-inputs/surfaces-web.json

# 3) Generate or edit UI, then validate against the same bundle
node scripts/interfacectl-tool.mjs run cli validate-generation \\
  --tool codex \\
  --surface surfaces-web \\
  --mode workspace \\
  --workspace-root /Users/mike/SurfacesPlatform/surfaces-webapps \\
  --bundle-root /Users/mike/SurfacesPlatform/surfaces-webapps/artifacts/generation-bundles/surfaces-web

# Optional: freeze one proof-loop session with attempt tracking
node scripts/interfacectl-tool.mjs run cli init-generation-session \\
  --bundle-root /Users/mike/SurfacesPlatform/surfaces-webapps/artifacts/generation-bundles/surfaces-web \\
  --surface surfaces-web \\
  --workspace-root /Users/mike/SurfacesPlatform/surfaces-webapps \\
  --tool codex \\
  --session codex-surfaces-web
node scripts/interfacectl-tool.mjs run cli record-generation-attempt \\
  --session-dir /Users/mike/SurfacesPlatform/surfaces-webapps/artifacts/generation-sessions/surfaces-web/codex-surfaces-web \\
  --assessment-file /Users/mike/SurfacesPlatform/surfaces-webapps/artifacts/generation-sessions/surfaces-web/codex-surfaces-web/assessment.json
node scripts/interfacectl-tool.mjs run cli summarize-generation-session \\
  --session-dir /Users/mike/SurfacesPlatform/surfaces-webapps/artifacts/generation-sessions/surfaces-web/codex-surfaces-web`;

export default function GenerationQuickStartPage() {
  return (
    <QuickStartSurfacePage
      activeTab="generation"
      contextLabel="Generation Quick Start"
      title="Prepare Local Agent Input Before AI UI Generation"
      summary="Use this flow when a local workspace agent needs one contract-aware payload before generation and a matching validation loop after code is written."
      steps={[
        {
          title: 'Compile the bundle.',
          detail: 'Generate a deterministic bundle for the target surface under artifacts/generation-bundles.'
        },
        {
          title: 'Prepare one surface payload.',
          detail: 'Resolve the bundle into one agent-ready JSON document under artifacts/generation-inputs.'
        },
        {
          title: 'Feed the prepared payload into the agent.',
          detail: 'Use the prepared JSON for bundle-aware generation instead of loading the raw contract directly.'
        },
        {
          title: 'Generate in the repo.',
          detail: 'Let the agent edit code inside the workspace while staying inside the surface-owned boundary.'
        },
        {
          title: 'Validate against the same bundle.',
          detail: 'Run workspace mode validation after generation and treat block as a stop condition.'
        },
        {
          title: 'Repeat until pass or accepted warn.',
          detail: 'Feed structured findings back into the next generation attempt.'
        },
        {
          title: 'Use tracked sessions when you need iteration evidence.',
          detail: 'init-generation-session, record-generation-attempt, and summarize-generation-session freeze inputs, record each validate result, and aggregate recurring issues.'
        }
      ]}
      snippetTitle="Copy/Paste Start"
      snippet={generationSnippet}
      notes={[
        'prepare-generation is the local-agent handoff and keeps bundle semantics centralized in interfacectl.',
        'Generation session commands are canonical interfacectl workflow, not repo-local wrappers.',
        'Workspace mode validation remains the authoritative gate after code is written.',
        'Hosted builders still stay on the descriptor + HTTP adapter path.',
        'The prepared payload is tool-neutral and can be wrapped in Codex, Cursor, or Claude Code workflows.',
        'Keep the compiled bundle and prepared JSON in artifacts/ so the same inputs can be reused across iterations.'
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
