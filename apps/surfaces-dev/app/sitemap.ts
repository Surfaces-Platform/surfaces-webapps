import type { MetadataRoute } from 'next';
import { surfacesDevUrl } from './mcp/discovery';

const lastModified = new Date('2026-06-20T00:00:00.000Z');

const routes = [
  '/',
  '/generation',
  '/integration',
  '/runtime',
  '/guides',
  '/mcp',
  '/mcp/judgmentkit',
  '/llms.txt',
  '/mcp/agent.txt',
  '/mcp/judgmentkit/agent.txt'
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: surfacesDevUrl(route),
    lastModified
  }));
}

