import test from "node:test";
import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const workflowsDir = path.join(repoRoot, ".github", "workflows");

async function readWorkflowFiles() {
  const entries = await fsp.readdir(workflowsDir, { withFileTypes: true });
  const workflowFiles = entries
    .filter((entry) => entry.isFile() && /\.ya?ml$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    workflowFiles.map(async (name) => ({
      name,
      content: await fsp.readFile(path.join(workflowsDir, name), "utf8"),
    })),
  );
}

test("GitHub Actions workflows keep storage-heavy caches and artifacts disabled", async () => {
  const workflows = await readWorkflowFiles();

  for (const { name, content } of workflows) {
    assert.doesNotMatch(content, /actions\/cache/, `${name} must not use Actions cache storage`);
    assert.doesNotMatch(content, /cache:\s*['"]?pnpm['"]?/i, `${name} must not enable setup-node pnpm caching`);
    assert.doesNotMatch(
      content,
      /apps\/surfaceops-desktop\/dist\/\*(?:\s|$)/,
      `${name} must not upload the whole desktop dist directory`,
    );
    assert.doesNotMatch(
      content,
      /apps\/surfaceops-web\/\.next/,
      `${name} must not upload bulky Next.js build output`,
    );
  }
});

test("GitHub Actions artifact uploads declare bounded retention", async () => {
  const workflows = await readWorkflowFiles();

  for (const { name, content } of workflows) {
    const uploadSteps = content.split(/\n(?=\s*-\s+name:\s+)/).filter((step) => step.includes("actions/upload-artifact"));

    for (const step of uploadSteps) {
      assert.match(step, /retention-days:\s*[1-7]\b/, `${name} upload-artifact step needs short retention`);
    }
  }
});

test("GitHub Actions inline run commands avoid YAML mapping ambiguity", async () => {
  const workflows = await readWorkflowFiles();
  const ambiguousRunLine = /^[ \t]*run:[ \t]+[^|>].*:[ \t]+/m;

  for (const { name, content } of workflows) {
    assert.doesNotMatch(
      content,
      ambiguousRunLine,
      `${name} should use a block scalar for run commands containing ': '`,
    );
  }
});
