import test from "node:test";
import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");

async function readWorkflow(fileName) {
  return fsp.readFile(path.join(repoRoot, ".github", "workflows", fileName), "utf8");
}

test("rehearsal release workflow is manual, prerelease-tagged, and isolated from production feed", async () => {
  const workflow = await readWorkflow("surfaceops-desktop-release-rehearsal.yml");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /surfaceops-desktop-feed-rehearsal/);
  assert.match(workflow, /rehearsal-v\$\{RELEASE_VERSION\}/);
  assert.match(workflow, /--prerelease/);
  assert.doesNotMatch(workflow, /surfaceops-desktop-feed"/);
});

test("rehearsal stable-promotion workflow supports soak simulation against the rehearsal feed", async () => {
  const workflow = await readWorkflow("surfaceops-desktop-stable-promotion-rehearsal.yml");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /soak_hours:/);
  assert.match(workflow, /override_now:/);
  assert.match(workflow, /surfaceops-desktop-feed-rehearsal/);
  assert.match(workflow, /--now/);
});

test("rehearsal promotion-control workflow only mutates the rehearsal feed", async () => {
  const workflow = await readWorkflow("surfaceops-desktop-promotion-control-rehearsal.yml");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /surfaceops-desktop-feed-rehearsal/);
  assert.doesNotMatch(workflow, /SURFACEOPS_MANIFEST_RELEASE_TAG: surfaceops-desktop-feed\s*$/m);
});
