export const surfacesDevOrigin = 'https://surfaces.dev';
export const judgmentKitOrigin = 'https://judgmentkit.ai';

export const mcpDiscoveryPaths = {
  mcpDocs: '/mcp',
  judgmentKitDocs: '/mcp/judgmentkit',
  mcpAgentIndex: '/mcp/agent.txt',
  judgmentKitAgentText: '/mcp/judgmentkit/agent.txt',
  llms: '/llms.txt'
} as const;

export function surfacesDevUrl(path: string) {
  return `${surfacesDevOrigin}${path}`;
}

export const mcpDiscoveryUrls = {
  mcpDocs: surfacesDevUrl(mcpDiscoveryPaths.mcpDocs),
  judgmentKitDocs: surfacesDevUrl(mcpDiscoveryPaths.judgmentKitDocs),
  mcpAgentIndex: surfacesDevUrl(mcpDiscoveryPaths.mcpAgentIndex),
  judgmentKitAgentText: surfacesDevUrl(mcpDiscoveryPaths.judgmentKitAgentText),
  llms: surfacesDevUrl(mcpDiscoveryPaths.llms),
  judgmentKitSystemOfRecord: judgmentKitOrigin
} as const;

export const surfacesDevLlmsText = `# surfaces.dev agent index

Canonical origin: ${surfacesDevOrigin}

surfaces.dev hosts developer and agent how-to documentation for contract-aware interface workflows.
Use judgmentkit.ai as the system of record for JudgmentKit MCP endpoint, install instructions, examples, eval reports, release proof, and generated evidence.

Primary docs:
- MCP docs: ${mcpDiscoveryUrls.mcpDocs}
- JudgmentKit MCP lifecycle docs: ${mcpDiscoveryUrls.judgmentKitDocs}

Agent-readable docs:
- MCP agent index: ${mcpDiscoveryUrls.mcpAgentIndex}
- JudgmentKit MCP agent recipe: ${mcpDiscoveryUrls.judgmentKitAgentText}

External system of record:
- JudgmentKit: ${mcpDiscoveryUrls.judgmentKitSystemOfRecord}
`;

export const mcpAgentIndexText = `# surfaces.dev MCP agent index

Use this index to locate agent-readable MCP workflow guidance on surfaces.dev.

Available MCP workflows:
- JudgmentKit MCP docs: ${mcpDiscoveryUrls.judgmentKitDocs}
- JudgmentKit MCP agent recipe: ${mcpDiscoveryUrls.judgmentKitAgentText}

Site-level agent index:
- ${mcpDiscoveryUrls.llms}

System of record:
- JudgmentKit endpoint, install, examples, eval reports, release proof, and generated evidence: ${mcpDiscoveryUrls.judgmentKitSystemOfRecord}
`;

