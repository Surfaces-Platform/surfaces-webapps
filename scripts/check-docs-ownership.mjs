#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { interfacectlDocLinks } from "../apps/_shared/interfacectl-doc-links.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function findWorkspaceRoot(startPath) {
  let current = startPath;

  while (true) {
    if (
      fs.existsSync(path.join(current, "interfacectl")) &&
      fs.existsSync(path.join(current, "surfaces-webapps"))
    ) {
      return current;
    }

    if (fs.existsSync(path.join(current, ".worktrees", "interfacectl-main"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(repoRoot, "../..");
    }
    current = parent;
  }
}

const workspaceRoot = findWorkspaceRoot(repoRoot);

const docsDir = path.join(repoRoot, "docs", "interfacectl");
const allowedDocsFiles = new Set(["README.md"]);
const forbiddenRepoPaths = [
  "docs/interfacectl/TESTING.md",
  "docs/interfacectl/ai-generator-adapter-api.md",
  "docs/interfacectl/ai-generator-adapter-quickstart.md",
  "docs/interfacectl/ai-tool-playbooks.md",
  "docs/interfacectl/contract-validation.md",
  "docs/interfacectl/decouple.md",
  "docs/interfacectl/generator-consumption.md",
  "docs/interfacectl/phase-4-reference.md",
  "docs/interfacectl/shell-boundary.md",
  "docs/interfacectl/examples/",
  "docs/interfacectl/plans/",
  "docs/interfacectl/test-history/",
];

const readmeRequirements = [
  "Canonical platform docs live in the `interfacectl` repo:",
  interfacectlDocLinks.cli.href,
  interfacectlDocLinks.api.href,
  interfacectlDocLinks.contractValidation.href,
  interfacectlDocLinks.runtimeEdge.href,
  interfacectlDocLinks.adapterQuickStart.href,
  interfacectlDocLinks.adapterApi.href,
  interfacectlDocLinks.toolPlaybooks.href,
  interfacectlDocLinks.generatorConsumption.href,
  interfacectlDocLinks.shellBoundary.href,
  "surfaces-dev /generation",
  "surfaces-dev /integration",
  "surfaces-dev /runtime",
];

const readmeForbidden = [
  "./contract-validation.md",
  "./generator-consumption.md",
  "./phase-4-reference.md",
  "./TESTING.md",
  "./surfaceops-visibility.md",
  "./runtime-edge.md",
];

const publishedPages = [
  {
    path: "apps/surfaces-dev/app/generation/page.tsx",
    required: [
      "interfacectlGenerationReferenceCards",
      "referenceCards={interfacectlGenerationReferenceCards}",
      "built on interfacectl",
    ],
  },
  {
    path: "apps/surfaces-dev/app/integration/page.tsx",
    required: [
      "interfacectlIntegrationReferenceCards",
      "referenceCards={interfacectlIntegrationReferenceCards}",
      "built on interfacectl",
    ],
  },
  {
    path: "apps/surfaces-dev/app/runtime/page.tsx",
    required: [
      "interfacectlRuntimeReferenceCards",
      "referenceCards={interfacectlRuntimeReferenceCards}",
      "built on interfacectl",
    ],
  },
  {
    path: "apps/interfacectl-web/app/page.tsx",
    required: [
      "Discovery Surface",
      "interfacectlDiscoveryCards",
      "utilities={interfacectlDocsNavigationLinks}",
      "Canonical Docs",
    ],
  },
];

const redirectPages = [
  {
    path: "apps/surfaces-dev/app/guides/ai-generator-adapter-quick-start/page.tsx",
    required: ["redirect('/generation');"],
  },
  {
    path: "apps/surfaces-dev/app/guides/ai-tool-playbooks/page.tsx",
    required: ["redirect('/integration');"],
  },
  {
    path: "apps/surfaces-dev/app/reference/generation-adapter-api/page.tsx",
    required: ["redirect('/integration');"],
  },
  {
    path: "apps/surfaces-dev/app/reference/shell-boundary/page.tsx",
    required: ["redirect('/generation');"],
  },
  {
    path: "apps/surfaces-dev/app/reference/validation-boundaries/page.tsx",
    required: ["redirect('/integration');"],
  },
];

const liveSearchRoots = [
  "README.md",
  "apps",
  "docs",
  "package.json",
  "scripts",
];

const searchIgnoreRoots = new Set([
  ".next",
  "contracts/generated",
  "docs/archive",
  "node_modules",
  "scripts/check-docs-ownership.mjs",
  "scripts/__tests__/docs-ownership.test.mjs",
]);

const searchableExtensions = new Set([
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
]);

function readRelative(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return {
    absolutePath,
    content: fs.readFileSync(absolutePath, "utf8"),
  };
}

function hrefToRepoPath(href) {
  const marker = "/blob/main/";
  const index = href.indexOf(marker);
  return index === -1 ? null : href.slice(index + marker.length);
}

function listTrackedDocsFiles(dir, prefix = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTrackedDocsFiles(fullPath, relativePath));
      continue;
    }
    files.push(relativePath);
  }

  return files;
}

function shouldSkipSearch(relativePath) {
  return [...searchIgnoreRoots].some((ignored) => relativePath === ignored || relativePath.startsWith(`${ignored}/`));
}

function searchFiles(rootRelativePath, collector) {
  const absolutePath = path.join(repoRoot, rootRelativePath);
  if (!fs.existsSync(absolutePath)) {
    return;
  }

  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    if (searchableExtensions.has(path.extname(absolutePath))) {
      collector.push(rootRelativePath);
    }
    return;
  }

  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    const relativePath = path.join(rootRelativePath, entry.name);
    if (shouldSkipSearch(relativePath)) {
      continue;
    }
    if (entry.isDirectory()) {
      searchFiles(relativePath, collector);
      continue;
    }
    if (searchableExtensions.has(path.extname(entry.name))) {
      collector.push(relativePath);
    }
  }
}

function resolveInterfacectlRoot(requiredLinks) {
  const envRoot = process.env.SURFACES_INTERFACECTL_ROOT;
  const candidates = [];

  if (envRoot) {
    candidates.push(envRoot);
  }

  candidates.push(path.join(workspaceRoot, "interfacectl"));

  const worktreesDir = path.join(workspaceRoot, ".worktrees");
  if (fs.existsSync(worktreesDir)) {
    for (const entry of fs.readdirSync(worktreesDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith("interfacectl")) {
        candidates.push(path.join(worktreesDir, entry.name));
      }
    }
  }

  return candidates.find((candidate) => {
    if (!fs.existsSync(path.join(candidate, "README.md"))) {
      return false;
    }

    return requiredLinks.every((link) => {
      const relativePath = hrefToRepoPath(link.href);
      return !relativePath || fs.existsSync(path.join(candidate, relativePath));
    });
  });
}

const failures = [];

const docsFiles = listTrackedDocsFiles(docsDir);
for (const docsFile of docsFiles) {
  if (!allowedDocsFiles.has(docsFile)) {
    failures.push(`${path.join(docsDir, docsFile)} should not exist under docs/interfacectl.`);
  }
}

const readme = readRelative("docs/interfacectl/README.md");
for (const required of readmeRequirements) {
  if (!readme.content.includes(required)) {
    failures.push(`${readme.absolutePath} is missing required ownership note: ${required}`);
  }
}
for (const forbidden of readmeForbidden) {
  if (readme.content.includes(forbidden)) {
    failures.push(`${readme.absolutePath} still points at deleted local docs: ${forbidden}`);
  }
}

for (const page of publishedPages) {
  const { absolutePath, content } = readRelative(page.path);
  for (const required of page.required) {
    if (!content.includes(required)) {
      failures.push(`${absolutePath} is missing required discovery-surface wiring: ${required}`);
    }
  }
}

for (const page of redirectPages) {
  const { absolutePath, content } = readRelative(page.path);
  for (const required of page.required) {
    if (!content.includes(required)) {
      failures.push(`${absolutePath} is missing required redirect target: ${required}`);
    }
  }
}

const searchableFiles = [];
for (const rootRelativePath of liveSearchRoots) {
  searchFiles(rootRelativePath, searchableFiles);
}

for (const relativePath of searchableFiles) {
  const absolutePath = path.join(repoRoot, relativePath);
  const content = fs.readFileSync(absolutePath, "utf8");
  for (const forbiddenPath of forbiddenRepoPaths) {
    if (content.includes(forbiddenPath)) {
      failures.push(`${absolutePath} still references deleted local docs path: ${forbiddenPath}`);
    }
  }
}

const canonicalLinks = Object.values(interfacectlDocLinks);
const interfacectlRoot = resolveInterfacectlRoot(canonicalLinks);
if (!interfacectlRoot) {
  failures.push("Could not locate an interfacectl checkout that contains the canonical docs.");
} else {
  for (const link of canonicalLinks) {
    const relativePath = hrefToRepoPath(link.href);
    if (!relativePath) {
      continue;
    }
    const targetPath = path.join(interfacectlRoot, relativePath);
    if (!fs.existsSync(targetPath)) {
      failures.push(`Canonical doc link target does not exist: ${link.href} -> ${targetPath}`);
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}

console.log("Docs ownership guard passed.");
