import QuickStartSurfacePage, { NextContextLinks } from '../_components/QuickStartSurfacePage';

const integrationSnippet = `# Local/CI hard gate command
pnpm run adapter:validate-generation -- \\
  --tool codex \\
  --surface reference-target-web \\
  --mode workspace \\
  --workspace-root /Users/mike/SurfacesPlatform/surfaces-webapps \\
  --contract /Users/mike/SurfacesPlatform/surfaces-webapps/contracts/surfaces.web.contract.json

# Exit behavior:
# 0  => pass or warn
# 30 => block (fail CI)
# 10 => malformed request / missing contract`;

export default function IntegrationQuickStartPage() {
  return (
    <QuickStartSurfacePage
      activeTab="integration"
      contextLabel="Integration Quick Start"
      title="Integrate Adapter Enforcement Into Tooling And CI"
      summary="Use this flow to connect generation-time checks to your promotion pipeline so hosted tools remain enforceable even when they cannot hard-block in-product."
      steps={[
        {
          title: 'Pick execution mode.',
          detail: 'Use workspace mode for local/CI promotion checks; use descriptor mode for hosted generator previews.'
        },
        {
          title: 'Map verdict behavior in tool UX.',
          detail: 'Block publish on block, surface warnings on warn, allow pass.'
        },
        {
          title: 'Add CI fallback gate.',
          detail: 'Run workspace adapter check in CI and fail on exit code 30.'
        },
        {
          title: 'Pin canonical contract path.',
          detail: 'Always point to contracts/surfaces.web.contract.json so all tools evaluate the same policy.'
        },
        {
          title: 'Store adapter findings with build artifacts.',
          detail: 'Use findings evidence for remediation and auditability.'
        }
      ]}
      snippetTitle="CI / Local Integration Command"
      snippet={integrationSnippet}
      notes={[
        'workspace mode runs generation guard plus interfacectl validate.',
        'descriptor mode is visibility-first; do not promote solely on descriptor-mode pass/warn.',
        'Hosted tools should call HTTP endpoint and still rely on CI hard gate for final promotion.'
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
