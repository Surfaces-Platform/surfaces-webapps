import type { Metadata } from 'next';
import {
  Callout,
  CodeBlock,
  InlineDocsLink,
  LifecycleMatrix,
  McpDocsPage,
  SequenceList
} from '../_components/McpDocsPage';
import {
  judgmentKitAgentText,
  judgmentKitCiSequence,
  judgmentKitGenerationSequence,
  judgmentKitLifecycleRows,
  judgmentKitRuntimeSequence,
  judgmentKitStatusMeanings
} from './content';
import { mcpDiscoveryUrls } from '../discovery';

export const metadata: Metadata = {
  title: 'JudgmentKit MCP lifecycle documentation',
  description:
    'Use JudgmentKit MCP review artifacts across Generation time, CI/CD time, and Runtime (edge).',
  alternates: {
    canonical: mcpDiscoveryUrls.judgmentKitDocs,
    types: {
      'text/plain': [
        { title: 'surfaces.dev MCP agent index', url: mcpDiscoveryUrls.mcpAgentIndex },
        { title: 'JudgmentKit MCP agent recipe', url: mcpDiscoveryUrls.judgmentKitAgentText }
      ]
    }
  }
};

const externalLinks = (
  <Callout>
    Use{' '}
    <InlineDocsLink href="https://judgmentkit.ai" external>
      judgmentkit.ai
    </InlineDocsLink>
    {' '}
    for the production MCP endpoint, install instructions, examples, eval reports, release proof,
    and generated evidence. Use this page for implementation guidance.
  </Callout>
);

export default function JudgmentKitMcpPage() {
  return (
    <McpDocsPage
      eyebrow="JudgmentKit MCP"
      title="Apply JudgmentKit Review Artifacts Across The Surfaces Lifecycle"
      summary="JudgmentKit MCP gives developers and agents executable review artifacts before generation, pinned references for integration integrity, and compact guidance that can be bundled into Runtime (edge) checks."
      sections={[
        {
          title: 'Lifecycle matrix',
          body:
            'The same JudgmentKit review evidence can guide different enforcement moments. Generation time prevents weak output from being authored, CI/CD time blocks drift before promotion, and Runtime (edge) constrains live request-time adaptation.',
          children: <LifecycleMatrix rows={judgmentKitLifecycleRows} />
        },
        {
          title: 'Generation time sequence',
          body:
            'Start with the user activity, not the component tree. The MCP sequence should produce a generation handoff only after activity review, workflow review, and diagnostic review are ready.',
          children: <SequenceList items={judgmentKitGenerationSequence} />
        },
        {
          title: 'CI/CD time sequence',
          body:
            'CI should not depend on an unpinned live judgment. Pin the JudgmentKit artifact first, then compare generated implementation evidence against it as an integration integrity check.',
          children: <SequenceList items={judgmentKitCiSequence} />
        },
        {
          title: 'Runtime (edge) sequence',
          body:
            'Runtime (edge) should use a deployment-bundled or cached guidance slice. The request path needs fast deterministic behavior and clear violation handling.',
          children: <SequenceList items={judgmentKitRuntimeSequence} />
        },
        {
          title: 'Review statuses',
          body:
            'Agents should treat JudgmentKit review status as control flow. Ready status can proceed, repair status must stop, and missing context must be collected before a claim is trusted.',
          children: <SequenceList items={judgmentKitStatusMeanings} />
        },
        {
          title: 'Agent text',
          body:
            'The same guidance is available as plain text for agents that need compact, parseable instructions.',
          children: (
            <>
              <CodeBlock value={judgmentKitAgentText} />
              <div style={{ marginTop: '12px' }}>
                <Callout>
                  Agent text route:{' '}
                  <InlineDocsLink href="/mcp/judgmentkit/agent.txt">
                    /mcp/judgmentkit/agent.txt
                  </InlineDocsLink>
                </Callout>
              </div>
            </>
          )
        },
        {
          title: 'System of record',
          children: externalLinks
        }
      ]}
    />
  );
}
