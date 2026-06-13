import test from "node:test";
import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { listSurfaceOpsDesktopReleaseAssets } from "../release/upload-surfaceops-desktop-release-assets.mjs";

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

test("desktop release workflows rebuild the prepared runtime without Actions caches", async () => {
  const rehearsalWorkflow = await readWorkflow("surfaceops-desktop-release-rehearsal.yml");
  const releaseWorkflow = await readWorkflow("surfaceops-desktop-release.yml");

  for (const workflow of [rehearsalWorkflow, releaseWorkflow]) {
    assert.match(workflow, /pnpm --filter surfaceops-desktop run build:runtime/);
    assert.match(workflow, /pnpm --filter surfaceops-desktop run package:mac:ci/);
    assert.doesNotMatch(workflow, /actions\/cache/);
    assert.doesNotMatch(workflow, /cache:\s*pnpm/);
    assert.doesNotMatch(workflow, /desktop-runtime-cache/);
    assert.doesNotMatch(workflow, /surfaceops-desktop-runtime-\$\{\{\s*github\.sha\s*\}\}/);
    assert.doesNotMatch(workflow, /pnpm --filter surfaceops-desktop run dist:mac:ci/);
  }
});

test("desktop release workflows use the shared upload helper and keep debug artifacts failure-gated", async () => {
  const rehearsalWorkflow = await readWorkflow("surfaceops-desktop-release-rehearsal.yml");
  const releaseWorkflow = await readWorkflow("surfaceops-desktop-release.yml");

  for (const workflow of [rehearsalWorkflow, releaseWorkflow]) {
    assert.match(workflow, /node scripts\/release\/upload-surfaceops-desktop-release-assets\.mjs/);
    assert.match(workflow, /--dist-dir "apps\/surfaceops-desktop\/dist"/);
    assert.match(workflow, /--extra "artifacts\/surfaceops-desktop-release-manifest\.json"/);
    assert.match(workflow, /--extra "artifacts\/surfaceops-desktop-release-notes\.json"/);
    assert.match(workflow, /if:\s*failure\(\)/);
    assert.match(workflow, /if-no-files-found:\s*ignore/);
    assert.match(workflow, /retention-days:\s*1/);
    assert.match(workflow, /apps\/surfaceops-desktop\/dist\/\*\.dmg/);
    assert.match(workflow, /apps\/surfaceops-desktop\/dist\/\*\.zip/);
    assert.match(workflow, /apps\/surfaceops-desktop\/dist\/\*\.blockmap/);
    assert.match(workflow, /apps\/surfaceops-desktop\/dist\/\*\.yml/);
    assert.doesNotMatch(workflow, /mapfile -t release_assets/);
    assert.doesNotMatch(workflow, /gh release upload "\$\{RELEASE_TAG\}"\s+apps\/surfaceops-desktop\/dist\/\*/);
    assert.doesNotMatch(workflow, /apps\/surfaceops-desktop\/dist\/\*\s*$/m);
  }
});

test("desktop release asset helper returns only top-level release files", async () => {
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-release-assets-"));

  try {
    await fsp.writeFile(path.join(tempDir, "SurfaceOps-0.1.0-arm64.dmg"), "");
    await fsp.writeFile(path.join(tempDir, "SurfaceOps-0.1.0-arm64.zip"), "");
    await fsp.writeFile(path.join(tempDir, "SurfaceOps-0.1.0-arm64.zip.blockmap"), "");
    await fsp.writeFile(path.join(tempDir, "latest-mac.yml"), "");
    await fsp.writeFile(path.join(tempDir, "metadata.json"), "");
    await fsp.mkdir(path.join(tempDir, "mac-arm64"), { recursive: true });
    await fsp.writeFile(path.join(tempDir, "mac-arm64", "nested.dmg"), "");

    const assets = await listSurfaceOpsDesktopReleaseAssets({ distDir: tempDir });

    assert.deepEqual(
      assets.map((entry) => path.basename(entry)),
      [
        "latest-mac.yml",
        "SurfaceOps-0.1.0-arm64.dmg",
        "SurfaceOps-0.1.0-arm64.zip",
        "SurfaceOps-0.1.0-arm64.zip.blockmap",
      ],
    );
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
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
