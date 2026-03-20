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
  assert.doesNotMatch(workflow, /version:\s*10\.26\.2/);
});

test("desktop release workflows rely on the repo packageManager pnpm version instead of pinning a second one", async () => {
  const rehearsalWorkflow = await readWorkflow("surfaceops-desktop-release-rehearsal.yml");
  const releaseWorkflow = await readWorkflow("surfaceops-desktop-release.yml");

  assert.match(rehearsalWorkflow, /uses:\s*pnpm\/action-setup@v4/);
  assert.match(releaseWorkflow, /uses:\s*pnpm\/action-setup@v4/);
  assert.doesNotMatch(rehearsalWorkflow, /version:\s*10\.26\.2/);
  assert.doesNotMatch(releaseWorkflow, /version:\s*10\.26\.2/);
});

test("desktop release workflows upload only top-level dist files to GitHub releases", async () => {
  const rehearsalWorkflow = await readWorkflow("surfaceops-desktop-release-rehearsal.yml");
  const releaseWorkflow = await readWorkflow("surfaceops-desktop-release.yml");

  for (const workflow of [rehearsalWorkflow, releaseWorkflow]) {
    assert.match(workflow, /find apps\/surfaceops-desktop\/dist -maxdepth 1 -type f/);
    assert.match(workflow, /-name '\*\.dmg'/);
    assert.match(workflow, /-name '\*\.zip'/);
    assert.match(workflow, /-name '\*\.blockmap'/);
    assert.match(workflow, /-name '\*\.yml'/);
    assert.match(workflow, /mapfile -t release_assets/);
    assert.match(workflow, /No top-level desktop release assets found in apps\/surfaceops-desktop\/dist/);
    assert.doesNotMatch(workflow, /gh release upload "\$\{RELEASE_TAG\}"\s+apps\/surfaceops-desktop\/dist\/\*/);
  }
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
