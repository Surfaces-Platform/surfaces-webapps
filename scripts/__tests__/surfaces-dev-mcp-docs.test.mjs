import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."),
);

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assertRouteExists(relativePath) {
  assert.ok(
    fs.existsSync(path.join(repoRoot, relativePath)),
    `Expected route source to exist: ${relativePath}`,
  );
}

test("surfaces.dev exposes JudgmentKit MCP docs routes", () => {
  assertRouteExists("apps/surfaces-dev/app/llms.txt/route.ts");
  assertRouteExists("apps/surfaces-dev/app/mcp/agent.txt/route.ts");
  assertRouteExists("apps/surfaces-dev/app/mcp/page.tsx");
  assertRouteExists("apps/surfaces-dev/app/mcp/judgmentkit/page.tsx");
  assertRouteExists("apps/surfaces-dev/app/mcp/judgmentkit/agent.txt/route.ts");
});

test("JudgmentKit MCP docs use Surfaces lifecycle terms", () => {
  const content = readRepoFile("apps/surfaces-dev/app/mcp/judgmentkit/content.ts");
  const page = readRepoFile("apps/surfaces-dev/app/mcp/judgmentkit/page.tsx");
  const combined = `${content}\n${page}`;

  assert.match(combined, /Generation time/);
  assert.match(combined, /CI\/CD time/);
  assert.match(combined, /Runtime \(edge\)/);
  assert.doesNotMatch(combined, /Agent runtime/);
});

test("Runtime edge guidance prescribes pinned artifacts instead of live critical-path calls", () => {
  const content = readRepoFile("apps/surfaces-dev/app/mcp/judgmentkit/content.ts");

  assert.match(content, /committed or cached JudgmentKit-derived artifacts/);
  assert.match(content, /deployment-bundled guidance slice or cached manifest/);
  assert.match(content, /Do not call live remote JudgmentKit MCP in a request-critical edge path/);
  assert.match(content, /audit, debug, or admin flows outside the critical path/);
});

test("agent text route returns text/plain lifecycle recipes", () => {
  const route = readRepoFile("apps/surfaces-dev/app/mcp/judgmentkit/agent.txt/route.ts");
  const content = readRepoFile("apps/surfaces-dev/app/mcp/judgmentkit/content.ts");

  assert.match(route, /Content-Type/);
  assert.match(route, /text\/plain; charset=utf-8/);
  assert.match(content, /Generation time recipe/);
  assert.match(content, /CI\/CD time recipe/);
  assert.match(content, /Runtime \(edge\) recipe/);
  assert.match(content, /create_activity_model_review/);
  assert.match(content, /review_ui_workflow_candidate/);
  assert.match(content, /review_cognitive_dimensions_candidate/);
  assert.match(content, /create_ui_generation_handoff/);
});

test("agent discovery indexes return text/plain and link to JudgmentKit guidance", () => {
  const llmsRoute = readRepoFile("apps/surfaces-dev/app/llms.txt/route.ts");
  const mcpAgentRoute = readRepoFile("apps/surfaces-dev/app/mcp/agent.txt/route.ts");
  const discovery = readRepoFile("apps/surfaces-dev/app/mcp/discovery.ts");

  assert.match(llmsRoute, /Content-Type/);
  assert.match(llmsRoute, /text\/plain; charset=utf-8/);
  assert.match(mcpAgentRoute, /Content-Type/);
  assert.match(mcpAgentRoute, /text\/plain; charset=utf-8/);
  assert.match(discovery, /https:\/\/surfaces\.dev/);
  assert.match(discovery, /judgmentKitAgentText: '\/mcp\/judgmentkit\/agent\.txt'/);
  assert.match(discovery, /mcpAgentIndex: '\/mcp\/agent\.txt'/);
  assert.match(discovery, /judgmentKitDocs: '\/mcp\/judgmentkit'/);
  assert.match(discovery, /https:\/\/judgmentkit\.ai/);
});

test("robots and sitemap expose MCP agent discovery routes", () => {
  const robots = readRepoFile("apps/surfaces-dev/app/robots.ts");
  const sitemap = readRepoFile("apps/surfaces-dev/app/sitemap.ts");

  assert.match(robots, /sitemap: surfacesDevUrl\('\/sitemap\.xml'\)/);
  assert.match(robots, /mcpDiscoveryPaths\.llms/);
  assert.match(robots, /mcpDiscoveryPaths\.mcpAgentIndex/);
  assert.match(robots, /mcpDiscoveryPaths\.judgmentKitAgentText/);
  assert.match(sitemap, /'\/llms\.txt'/);
  assert.match(sitemap, /'\/mcp'/);
  assert.match(sitemap, /'\/mcp\/agent\.txt'/);
  assert.match(sitemap, /'\/mcp\/judgmentkit'/);
  assert.match(sitemap, /'\/mcp\/judgmentkit\/agent\.txt'/);
});

test("MCP HTML pages expose text alternatives in metadata", () => {
  const landing = readRepoFile("apps/surfaces-dev/app/mcp/page.tsx");
  const page = readRepoFile("apps/surfaces-dev/app/mcp/judgmentkit/page.tsx");

  assert.match(landing, /export const metadata/);
  assert.match(landing, /alternates/);
  assert.match(landing, /'text\/plain'/);
  assert.match(landing, /mcpDiscoveryUrls\.llms/);
  assert.match(landing, /mcpDiscoveryUrls\.mcpAgentIndex/);
  assert.match(page, /export const metadata/);
  assert.match(page, /alternates/);
  assert.match(page, /'text\/plain'/);
  assert.match(page, /mcpDiscoveryUrls\.mcpAgentIndex/);
  assert.match(page, /mcpDiscoveryUrls\.judgmentKitAgentText/);
});

test("MCP docs preserve JudgmentKit system-of-record ownership", () => {
  const landing = readRepoFile("apps/surfaces-dev/app/mcp/page.tsx");
  const page = readRepoFile("apps/surfaces-dev/app/mcp/judgmentkit/page.tsx");
  const content = readRepoFile("apps/surfaces-dev/app/mcp/judgmentkit/content.ts");
  const combined = `${landing}\n${page}\n${content}`;

  assert.match(combined, /does not own JudgmentKit MCP behavior/);
  assert.match(combined, /does not replace JudgmentKit eval evidence/);
  assert.match(combined, /judgmentkit\.ai remains the MCP endpoint/);
  assert.match(combined, /install, examples, eval reports, release proof, and generated evidence/);
  assert.doesNotMatch(combined, /Surfaces owns JudgmentKit MCP behavior/);
});
