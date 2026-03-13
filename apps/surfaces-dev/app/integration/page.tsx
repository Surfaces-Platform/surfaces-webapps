import QuickStartSurfacePage, { NextContextLinks } from '../_components/QuickStartSurfacePage';

const integrationSnippet = `# Local/CI hard gate command
node scripts/interfacectl-tool.mjs run cli compile \\
  --contract /Users/mike/SurfacesPlatform/surfaces-webapps/contracts/surfaces.web.contract.json \\
  --out /Users/mike/SurfacesPlatform/surfaces-webapps/artifacts/generation-bundles/surfaces-web

node scripts/interfacectl-tool.mjs run cli prepare-generation \\
  --bundle-root /Users/mike/SurfacesPlatform/surfaces-webapps/artifacts/generation-bundles/surfaces-web \\
  --surface surfaces-web \\
  --out /Users/mike/SurfacesPlatform/surfaces-webapps/artifacts/generation-inputs/surfaces-web.json

node scripts/interfacectl-tool.mjs run cli validate-generation \\
  --tool codex \\
  --surface surfaces-web \\
  --mode workspace \\
  --workspace-root /Users/mike/SurfacesPlatform/surfaces-webapps \\
  --bundle-root /Users/mike/SurfacesPlatform/surfaces-webapps/artifacts/generation-bundles/surfaces-web

# Exit behavior:
# 0  => pass or warn
# 30 => block (fail CI)
# 10 => malformed request / missing bundle
#
# Icon policy behavior in workspace mode:
# icon.source-disallowed + policy=warn   => status=warn, exit 0
# icon.source-disallowed + policy=strict => status=block, exit 30
# CI validation findings are stored at artifacts/interfacectl-report.json`;

export default function IntegrationQuickStartPage() {
  return (
    <QuickStartSurfacePage
      activeTab="integration"
      contextLabel="Integration Quick Start"
      title="Integrate Adapter Enforcement Into Tooling And CI"
      summary="Use this flow at CI/CD time to connect Generation time checks to promotion gates so hosted tools remain enforceable even when they cannot hard-block in-product."
      steps={[
        {
          title: 'Pick execution mode.',
          detail: 'Use workspace mode for local/CI promotion checks; use descriptor mode for hosted generator previews.'
        },
        {
          title: 'Apply rollout parity rules.',
          detail: 'Descriptor color/icon parity is enforced only for surfaces listed in contracts/generation-descriptor-parity.json.'
        },
        {
          title: 'Map verdict behavior in tool UX.',
          detail: 'Block publish on block, surface warnings on warn, allow pass.'
        },
        {
          title: 'Review icon findings in workspace mode.',
          detail: 'When configured, `icon.source-disallowed` is surfaced here; warn policy stays non-blocking, strict policy blocks.'
        },
        {
          title: 'Add CI fallback gate.',
          detail: 'Run workspace adapter check in CI and fail on exit code 30.'
        },
        {
          title: 'Compile and pin bundle artifacts.',
          detail: 'Compile into artifacts/generation-bundles/<surface-id> and prepare the local-agent payload under artifacts/generation-inputs/<surface-id>.json.'
        },
        {
          title: 'Store adapter findings with build artifacts.',
          detail: 'Use findings evidence for remediation and auditability.'
        },
        {
          title: 'Capture operator proof sessions separately.',
          detail: 'When you need iteration history, use the canonical generation session commands to freeze one bundle and record each attempt before promotion.'
        }
      ]}
      snippetTitle="CI / Local Integration Command"
      snippet={integrationSnippet}
      notes={[
        'prepare-generation is optional for the CI gate itself, but it keeps local-agent and CI inputs aligned on the same bundle revision.',
        'Generation session commands live beside the CI path and are for tracked local-agent evaluation, not for replacing the final workspace gate.',
        'workspace mode runs generation guard plus interfacectl validate.',
        'CI/CD workspace validation remains the authoritative promotion gate, even when descriptor parity is enabled.',
        'Descriptor mode parity is phased by surface; do not promote solely on descriptor-mode pass/warn.',
        'Hosted tools should call HTTP endpoint and still rely on CI hard gate for final promotion.',
        'In CI, inspect uploaded artifact artifacts/interfacectl-report.json for full findings.'
      ]}
      actions={
        <NextContextLinks
          left={{ href: '/generation', label: 'Generation Quick Start' }}
          right={{ href: '/runtime', label: 'Runtime Quick Start' }}
        />
      }
    />
  );
}
