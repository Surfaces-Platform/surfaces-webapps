import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultPromotionState,
  createEmptyDesktopReleaseManifest,
  parseArgs,
  promoteStableRelease,
  updatePromotionState,
  upsertChannelRelease,
} from "../release/lib/surfaceops-desktop-feed.mjs";

function createAlphaRelease({
  version = "1.0.0",
  publishedAt = "2026-03-16T00:00:00.000Z",
} = {}) {
  return {
    id: `desktop-alpha-${version}`,
    channel: "alpha",
    version,
    name: `SurfaceOps Desktop ${version}`,
    publishedAt,
    availability: "published",
    notes: {
      title: `SurfaceOps Desktop ${version}`,
      summary: `Summary for ${version}`,
      bullets: ["Alpha release"],
    },
    platforms: {
      "darwin-arm64": {
        dmg: { url: `https://example.com/SurfaceOps-${version}.dmg`, size: 100, sha512: "dmg-sha" },
        zip: { url: `https://example.com/SurfaceOps-${version}.zip`, size: 120, sha512: "zip-sha" },
      },
    },
  };
}

test("stable promotion waits until the alpha soak window completes", () => {
  const manifest = upsertChannelRelease(
    createEmptyDesktopReleaseManifest("2026-03-16T00:00:00.000Z"),
    createAlphaRelease(),
    "2026-03-16T00:00:00.000Z",
  );

  const earlyResult = promoteStableRelease({
    manifest,
    promotionState: createDefaultPromotionState("2026-03-16T00:00:00.000Z"),
    now: "2026-03-18T23:59:59.000Z",
  });

  assert.equal(earlyResult.changed, false);
  assert.equal(earlyResult.reason, "soak-incomplete");

  const readyResult = promoteStableRelease({
    manifest,
    promotionState: createDefaultPromotionState("2026-03-16T00:00:00.000Z"),
    now: "2026-03-19T00:00:00.000Z",
  });

  assert.equal(readyResult.changed, true);
  assert.equal(readyResult.reason, "soak-complete");
  assert.equal(readyResult.promotedRelease?.id, "desktop-stable-1.0.0");
  assert.equal(readyResult.promotedRelease?.version, "1.0.0");
  assert.equal(
    readyResult.manifest.channels.stable.promotedReleaseId,
    "desktop-stable-1.0.0",
  );
  assert.equal(
    readyResult.promotedRelease?.platforms["darwin-arm64"].dmg.url,
    "https://example.com/SurfaceOps-1.0.0.dmg",
  );
});

test("blocked alpha releases do not auto-promote to stable", () => {
  const alphaRelease = createAlphaRelease();
  const manifest = upsertChannelRelease(
    createEmptyDesktopReleaseManifest("2026-03-16T00:00:00.000Z"),
    alphaRelease,
    "2026-03-16T00:00:00.000Z",
  );
  const promotionState = updatePromotionState({
    promotionState: createDefaultPromotionState("2026-03-16T00:00:00.000Z"),
    action: "block",
    releaseId: alphaRelease.id,
    reason: "Incident under investigation.",
    now: "2026-03-17T00:00:00.000Z",
  });

  const result = promoteStableRelease({
    manifest,
    promotionState,
    now: "2026-03-19T00:00:00.000Z",
  });

  assert.equal(result.changed, false);
  assert.equal(result.reason, "release-blocked");
  assert.equal(result.manifest.channels.stable.promotedReleaseId, null);
});

test("force-promote bypasses the soak window and clears the pending override", () => {
  const alphaRelease = createAlphaRelease({ version: "1.1.0" });
  const manifest = upsertChannelRelease(
    createEmptyDesktopReleaseManifest("2026-03-16T00:00:00.000Z"),
    alphaRelease,
    "2026-03-16T00:00:00.000Z",
  );
  const promotionState = updatePromotionState({
    promotionState: createDefaultPromotionState("2026-03-16T00:00:00.000Z"),
    action: "force-promote",
    releaseId: alphaRelease.id,
    now: "2026-03-16T01:00:00.000Z",
  });

  const result = promoteStableRelease({
    manifest,
    promotionState,
    now: "2026-03-16T02:00:00.000Z",
  });

  assert.equal(result.changed, true);
  assert.equal(result.reason, "force-promoted");
  assert.equal(result.promotedRelease?.id, "desktop-stable-1.1.0");
  assert.equal(result.promotionState.forcePromoteReleaseId, null);
});

test("release-script argument parsing ignores pnpm's standalone double-dash separator", () => {
  assert.deepEqual(
    parseArgs(["--", "--version", "0.1.0-rc.1", "--channel", "alpha"]),
    {
      version: "0.1.0-rc.1",
      channel: "alpha",
    },
  );
});
