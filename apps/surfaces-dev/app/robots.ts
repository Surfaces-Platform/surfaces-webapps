import type { MetadataRoute } from 'next';
import {
  mcpDiscoveryPaths,
  surfacesDevOrigin,
  surfacesDevUrl
} from './mcp/discovery';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          mcpDiscoveryPaths.llms,
          mcpDiscoveryPaths.mcpDocs,
          mcpDiscoveryPaths.mcpAgentIndex,
          mcpDiscoveryPaths.judgmentKitDocs,
          mcpDiscoveryPaths.judgmentKitAgentText
        ]
      }
    ],
    sitemap: surfacesDevUrl('/sitemap.xml'),
    host: surfacesDevOrigin
  };
}

