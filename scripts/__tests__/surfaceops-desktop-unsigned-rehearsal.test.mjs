import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildUnsignedRehearsalManifestUrl,
  resolveUnsignedRehearsalConfig,
  stageUnsignedRehearsal,
  startUnsignedRehearsalStaticServer,
} from "../release/lib/surfaceops-desktop-unsigned-rehearsal.mjs";

function writeBinary(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(contents));
}

test("unsigned rehearsal config defaults to a stable local manifest URL", () => {
  const config = resolveUnsignedRehearsalConfig({
    repoRoot: "/repo",
    env: {},
  });

  assert.equal(
    config.manifestUrl,
    "http://127.0.0.1:4173/surfaceops-desktop-release-manifest.json",
  );
  assert.equal(
    buildUnsignedRehearsalManifestUrl(config.baseUrl),
    config.manifestUrl,
  );
  assert.equal(
    config.stageDir,
    path.join("/repo", "artifacts", "surfaceops-desktop-unsigned-rehearsal"),
  );
});

test("staging an unsigned rehearsal copies artifacts and writes local manifest files", async () => {
  const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-unsigned-stage-"));
  const distDir = path.join(sandbox, "apps", "surfaceops-desktop", "dist");
  const outDir = path.join(sandbox, "artifacts", "surfaceops-desktop-unsigned-rehearsal");

  try {
    writeBinary(path.join(distDir, "SurfaceOps-0.1.0-rc.1-arm64.dmg"), "rc1-dmg");
    writeBinary(path.join(distDir, "SurfaceOps-0.1.0-rc.1-arm64.zip"), "rc1-zip");

    const result = await stageUnsignedRehearsal({
      repoRoot: sandbox,
      distDir,
      outDir,
      baseUrl: "http://127.0.0.1:4173",
      version: "0.1.0-rc.1",
      publishedAt: "2026-03-17T00:00:00.000Z",
    });

    const manifest = JSON.parse(await fsp.readFile(result.manifestPath, "utf8"));
    const notes = JSON.parse(await fsp.readFile(result.notesPath, "utf8"));
    const promotionState = JSON.parse(await fsp.readFile(result.promotionStatePath, "utf8"));

    assert.equal(manifest.channels.alpha.promotedReleaseId, "desktop-alpha-0.1.0-rc.1");
    assert.equal(manifest.channels.alpha.releases[0].version, "0.1.0-rc.1");
    assert.equal(
      manifest.channels.alpha.releases[0].platforms["darwin-arm64"].dmg.url,
      "http://127.0.0.1:4173/releases/0.1.0-rc.1/SurfaceOps-0.1.0-rc.1-arm64.dmg",
    );
    assert.match(notes.release.notes.summary, /Unsigned local engineering rehearsal/i);
    assert.deepEqual(promotionState.blockedReleaseIds, {});
    await fsp.access(path.join(outDir, "releases", "0.1.0-rc.1", "SurfaceOps-0.1.0-rc.1-arm64.dmg"));
    await fsp.access(path.join(outDir, "releases", "0.1.0-rc.1", "SurfaceOps-0.1.0-rc.1-arm64.zip"));
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});

test("staging a newer unsigned rehearsal preserves prior releases and promotion state", async () => {
  const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-unsigned-stage-history-"));
  const distDir = path.join(sandbox, "apps", "surfaceops-desktop", "dist");
  const outDir = path.join(sandbox, "artifacts", "surfaceops-desktop-unsigned-rehearsal");

  try {
    writeBinary(path.join(distDir, "SurfaceOps-0.1.0-rc.1-arm64.dmg"), "rc1-dmg");
    writeBinary(path.join(distDir, "SurfaceOps-0.1.0-rc.1-arm64.zip"), "rc1-zip");
    const firstStage = await stageUnsignedRehearsal({
      repoRoot: sandbox,
      distDir,
      outDir,
      baseUrl: "http://127.0.0.1:4173",
      version: "0.1.0-rc.1",
      publishedAt: "2026-03-17T00:00:00.000Z",
    });

    const preservedState = JSON.parse(await fsp.readFile(firstStage.promotionStatePath, "utf8"));
    preservedState.blockedReleaseIds["desktop-alpha-0.1.0-rc.1"] = {
      blockedAt: "2026-03-17T01:00:00.000Z",
      reason: "Unsigned rehearsal incident drill.",
    };
    await fsp.writeFile(firstStage.promotionStatePath, JSON.stringify(preservedState, null, 2), "utf8");

    writeBinary(path.join(distDir, "SurfaceOps-0.1.0-rc.2-arm64.dmg"), "rc2-dmg");
    writeBinary(path.join(distDir, "SurfaceOps-0.1.0-rc.2-arm64.zip"), "rc2-zip");
    const secondStage = await stageUnsignedRehearsal({
      repoRoot: sandbox,
      distDir,
      outDir,
      baseUrl: "http://127.0.0.1:4173",
      version: "0.1.0-rc.2",
      publishedAt: "2026-03-17T02:00:00.000Z",
    });

    const manifest = JSON.parse(await fsp.readFile(secondStage.manifestPath, "utf8"));
    const promotionState = JSON.parse(await fsp.readFile(secondStage.promotionStatePath, "utf8"));

    assert.deepEqual(
      manifest.channels.alpha.releases.map((release) => release.version),
      ["0.1.0-rc.2", "0.1.0-rc.1"],
    );
    assert.equal(
      promotionState.blockedReleaseIds["desktop-alpha-0.1.0-rc.1"]?.reason,
      "Unsigned rehearsal incident drill.",
    );
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});

test("unsigned rehearsal static server serves the staged manifest over HTTP", async () => {
  const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-unsigned-server-"));

  try {
    writeBinary(
      path.join(sandbox, "surfaceops-desktop-release-manifest.json"),
      JSON.stringify({ ok: true }),
    );

    const serverState = await startUnsignedRehearsalStaticServer({
      rootDir: sandbox,
      host: "127.0.0.1",
      port: 0,
    });

    try {
      const response = await fetch(
        buildUnsignedRehearsalManifestUrl(serverState.baseUrl),
        { cache: "no-store" },
      );
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true });
    } finally {
      await new Promise((resolve) => serverState.server.close(resolve));
    }
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});
