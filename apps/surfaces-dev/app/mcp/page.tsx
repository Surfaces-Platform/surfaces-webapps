import type { Metadata } from 'next';
import {
  Callout,
  LinkGrid,
  McpDocsPage,
  SequenceList
} from './_components/McpDocsPage';
import { mcpDiscoveryUrls } from './discovery';

export const metadata: Metadata = {
  title: 'surfaces.dev MCP documentation',
  description:
    'Developer and agent workflow documentation for using MCP capabilities with Surfaces lifecycle enforcement.',
  alternates: {
    canonical: mcpDiscoveryUrls.mcpDocs,
    types: {
      'text/plain': [
        { title: 'surfaces.dev agent index', url: mcpDiscoveryUrls.llms },
        { title: 'surfaces.dev MCP agent index', url: mcpDiscoveryUrls.mcpAgentIndex }
      ]
    }
  }
};

const mcpWorkflows = [
  {
    label: 'JudgmentKit MCP',
    href: '/mcp/judgmentkit',
    description:
      'Use activity review, workflow review, Cognitive Dimensions diagnostics, and generation handoff across Generation time, CI/CD time, and Runtime (edge).',
    eyebrow: 'Workflow docs'
  },
  {
    label: 'Agent text contract',
    href: '/mcp/judgmentkit/agent.txt',
    description:
      'Plain text lifecycle guidance for agents that need compact JudgmentKit MCP recipes.',
    eyebrow: 'Agent-readable'
  },
  {
    label: 'MCP agent index',
    href: '/mcp/agent.txt',
    description:
      'Plain text index of available MCP workflows and their agent-readable guidance files.',
    eyebrow: 'Agent-readable'
  },
  {
    label: 'JudgmentKit evidence',
    href: 'https://judgmentkit.ai',
    description:
      'Install instructions, production MCP endpoint, eval reports, examples, release proof, and generated evidence remain on judgmentkit.ai.',
    eyebrow: 'System of record',
    external: true
  }
];

const lifecycleSteps = [
  {
    label: 'Generation time.',
    text: 'Use MCP review tools before code or UI artifacts are generated so the agent starts from activity fit and workflow responsibilities.'
  },
  {
    label: 'CI/CD time.',
    text: 'Compare implementation output against pinned contracts, review artifacts, and handoff expectations before shipping.'
  },
  {
    label: 'Runtime (edge).',
    text: 'Load committed or cached JudgmentKit-derived artifacts in request paths and block, constrain, or signal violations before render.'
  }
];

export default function McpLandingPage() {
  return (
    <McpDocsPage
      eyebrow="MCP documentation"
      title="Use MCPs As Contract-Aware Workflow Interfaces"
      summary="surfaces.dev hosts developer and agent guidance for applying MCP capabilities to interface governance. The docs explain how MCP outputs become usable contracts, review artifacts, and enforcement inputs across the Surfaces lifecycle."
      sections={[
        {
          title: 'Documented workflows',
          body:
            'Each workflow page explains which artifact is created, when it should be trusted, and how violations are handled. Product proof, evals, examples, install details, and MCP endpoint availability stay on the owning system of record.',
          children: <LinkGrid links={mcpWorkflows} />
        },
        {
          title: 'Lifecycle usage',
          body:
            'MCP docs on surfaces.dev follow the Surfaces taxonomy. They are not prompt recipes alone; they describe how agent-visible judgment is captured, pinned, and enforced.',
          children: <SequenceList items={lifecycleSteps} />
        },
        {
          title: 'Boundary',
          children: (
            <Callout>
              surfaces.dev does not own JudgmentKit MCP behavior and does not replace JudgmentKit eval evidence.
              It explains how developers and agents should consume that behavior when building governed apps,
              CI checks, and Runtime (edge) integrations.
            </Callout>
          )
        }
      ]}
    />
  );
}
