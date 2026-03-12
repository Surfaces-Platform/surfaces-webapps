import QuickStartSurfacePage, { NextContextLinks } from '../_components/QuickStartSurfacePage';
import { interfacectlIntegrationReferenceCards } from '../../../_shared/interfacectl-doc-links.js';

const integrationSnippet = `# Local/CI hard gate command
pnpm run adapter:validate-generation -- \\
  --tool codex \\
  --surface surfaces-web \\
  --mode workspace \\
  --workspace-root /Users/mike/SurfacesPlatform/surfaces-webapps \\
  --contract /Users/mike/SurfacesPlatform/surfaces-webapps/contracts/surfaces.web.contract.json

# Exit behavior:
# 0  => pass or warn
# 30 => block (fail CI)
# 10 => malformed request / missing contract
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
      summary="Use this repo-level CI/CD workflow to connect Generation time checks to promotion gates so hosted tools remain enforceable even when they cannot hard-block in-product. It is built on interfacectl, not a replacement for the canonical tooling docs."
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
          title: 'Pin canonical contract path.',
          detail: 'Use contracts/surfaces.web.contract.json for canonical surfaces; use contracts/generated/reference-target-web.contract.json for reference-target demos.'
        },
        {
          title: 'Store adapter findings with build artifacts.',
          detail: 'Use findings evidence for remediation and auditability.'
        }
      ]}
      snippetTitle="CI / Local Integration Command"
      snippet={integrationSnippet}
      referenceCards={interfacectlIntegrationReferenceCards}
      notes={[
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
