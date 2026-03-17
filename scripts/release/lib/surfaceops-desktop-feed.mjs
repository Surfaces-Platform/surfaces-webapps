import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_SURFACEOPS_DESKTOP_SOAK_HOURS = 72;

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--") {
      continue;
    }
    if (!current?.startsWith("--")) {
      continue;
    }
    const key = current.slice(2);
    const value = argv[index + 1];
    args[key] = value;
    index += 1;
  }
  return args;
}

export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function buildFeedReleaseId(channel, version) {
  return `desktop-${channel}-${version}`;
}

export function buildDefaultReleaseName(version) {
  return `SurfaceOps Desktop ${version}`;
}

export function createEmptyDesktopReleaseManifest(now = new Date().toISOString()) {
  return {
    generatedAt: now,
    channels: {
      alpha: { channel: "alpha", promotedReleaseId: null, releases: [] },
      stable: { channel: "stable", promotedReleaseId: null, releases: [] },
    },
  };
}

export function createDefaultPromotionState(now = new Date().toISOString()) {
  return {
    generatedAt: now,
    blockedReleaseIds: {},
    forcePromoteReleaseId: null,
  };
}

export async function loadJsonFile(filePath, fallbackFactory) {
  if (!filePath) {
    return fallbackFactory();
  }

  try {
    const raw = await fs.readFile(path.resolve(filePath), "utf8");
    return JSON.parse(raw);
  } catch {
    return fallbackFactory();
  }
}

export async function writeJsonFile(filePath, value) {
  const resolvedPath = path.resolve(filePath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, JSON.stringify(value, null, 2), "utf8");
}

function normalizeBullets(bullets) {
  return Array.isArray(bullets)
    ? bullets.map((entry) => String(entry ?? "").trim()).filter(Boolean)
    : [];
}

function extractBulletsFromMarkdown(markdown) {
  return String(markdown ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function extractSummaryFromMarkdown(markdown) {
  const ignoredPrefixes = ["#", "-", "*", "**Full Changelog**"];
  return String(markdown ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !ignoredPrefixes.some((prefix) => line.startsWith(prefix)) && !/^\d+\.\s+/.test(line)) ?? null;
}

export function buildReleaseNotesPayload({
  version,
  releaseName,
  releaseBody = "",
  title = null,
  summary = null,
  bullets = [],
}) {
  const noteTitle = String(title ?? "").trim() || String(releaseName ?? "").trim() || buildDefaultReleaseName(version);
  const normalizedBullets = normalizeBullets(bullets);
  const derivedBullets = normalizedBullets.length > 0 ? normalizedBullets : extractBulletsFromMarkdown(releaseBody);
  const noteSummary =
    String(summary ?? "").trim() ||
    extractSummaryFromMarkdown(releaseBody) ||
    `${noteTitle} release.`;

  return {
    title: noteTitle,
    summary: noteSummary,
    bullets: derivedBullets,
  };
}

export function upsertChannelRelease(manifest, release, generatedAt = new Date().toISOString()) {
  const nextManifest = cloneJson(manifest);
  const channelManifest = nextManifest.channels[release.channel] ?? {
    channel: release.channel,
    promotedReleaseId: null,
    releases: [],
  };

  channelManifest.promotedReleaseId = release.id;
  channelManifest.releases = [
    release,
    ...channelManifest.releases.filter((entry) => entry.id !== release.id),
  ];
  nextManifest.channels[release.channel] = channelManifest;
  nextManifest.generatedAt = generatedAt;

  return nextManifest;
}

export function createReleaseNotesFilePayload(release, generatedAt = new Date().toISOString()) {
  return {
    generatedAt,
    release,
  };
}

export function updatePromotionState({
  promotionState,
  action,
  releaseId = null,
  reason = null,
  now = new Date(),
}) {
  const nextState = cloneJson(promotionState);
  const timestamp = new Date(now).toISOString();
  nextState.generatedAt = timestamp;
  nextState.blockedReleaseIds = nextState.blockedReleaseIds ?? {};

  if (action === "block") {
    if (!releaseId) {
      throw new Error("Blocking a desktop release requires --release-id.");
    }

    nextState.blockedReleaseIds[releaseId] = {
      blockedAt: timestamp,
      reason: String(reason ?? "").trim() || "Operator blocked stable promotion.",
    };
    return nextState;
  }

  if (action === "unblock") {
    if (!releaseId) {
      throw new Error("Unblocking a desktop release requires --release-id.");
    }

    delete nextState.blockedReleaseIds[releaseId];
    return nextState;
  }

  if (action === "force-promote") {
    if (!releaseId) {
      throw new Error("Force-promoting a desktop release requires --release-id.");
    }

    nextState.forcePromoteReleaseId = releaseId;
    return nextState;
  }

  if (action === "clear-force") {
    nextState.forcePromoteReleaseId = null;
    return nextState;
  }

  throw new Error(`Unknown promotion-state action: ${action}`);
}

export function promoteStableRelease({
  manifest,
  promotionState,
  soakHours = DEFAULT_SURFACEOPS_DESKTOP_SOAK_HOURS,
  now = new Date(),
}) {
  const timestamp = new Date(now).toISOString();
  const nextManifest = cloneJson(manifest);
  const nextState = cloneJson(promotionState);
  nextState.generatedAt = timestamp;
  nextState.blockedReleaseIds = nextState.blockedReleaseIds ?? {};

  const alphaChannel = nextManifest.channels.alpha ?? { promotedReleaseId: null, releases: [] };
  const stableChannel = nextManifest.channels.stable ?? { promotedReleaseId: null, releases: [] };
  const forcedReleaseId = nextState.forcePromoteReleaseId;

  const alphaRelease = forcedReleaseId
    ? alphaChannel.releases.find((release) => release.id === forcedReleaseId) ?? null
    : alphaChannel.releases.find((release) => release.id === alphaChannel.promotedReleaseId) ?? null;

  if (!alphaRelease) {
    return {
      changed: false,
      reason: forcedReleaseId ? "forced-release-missing" : "no-alpha-release",
      manifest: nextManifest,
      promotionState: nextState,
      promotedRelease: null,
      notesPayload: null,
    };
  }

  if (nextState.blockedReleaseIds[alphaRelease.id]) {
    return {
      changed: false,
      reason: "release-blocked",
      manifest: nextManifest,
      promotionState: nextState,
      promotedRelease: null,
      notesPayload: null,
    };
  }

  const currentStableRelease =
    stableChannel.releases.find((release) => release.id === stableChannel.promotedReleaseId) ?? null;
  if (currentStableRelease?.version === alphaRelease.version) {
    if (forcedReleaseId) {
      nextState.forcePromoteReleaseId = null;
      return {
        changed: true,
        reason: "already-promoted",
        manifest: nextManifest,
        promotionState: nextState,
        promotedRelease: currentStableRelease,
        notesPayload: createReleaseNotesFilePayload(currentStableRelease, timestamp),
      };
    }

    return {
      changed: false,
      reason: "already-promoted",
      manifest: nextManifest,
      promotionState: nextState,
      promotedRelease: currentStableRelease,
      notesPayload: null,
    };
  }

  const soakMs = Math.max(0, Number(soakHours) || 0) * 60 * 60 * 1000;
  const alphaPublishedAtMs = Date.parse(alphaRelease.publishedAt);
  const releaseReady = Number.isFinite(alphaPublishedAtMs) && (alphaPublishedAtMs + soakMs) <= Date.parse(timestamp);

  if (!forcedReleaseId && !releaseReady) {
    return {
      changed: false,
      reason: "soak-incomplete",
      manifest: nextManifest,
      promotionState: nextState,
      promotedRelease: null,
      notesPayload: null,
    };
  }

  const promotedStableRelease = {
    ...cloneJson(alphaRelease),
    id: buildFeedReleaseId("stable", alphaRelease.version),
    channel: "stable",
    publishedAt: timestamp,
  };

  const promotedManifest = upsertChannelRelease(nextManifest, promotedStableRelease, timestamp);
  nextState.forcePromoteReleaseId = null;

  return {
    changed: true,
    reason: forcedReleaseId ? "force-promoted" : "soak-complete",
    manifest: promotedManifest,
    promotionState: nextState,
    promotedRelease: promotedStableRelease,
    notesPayload: createReleaseNotesFilePayload(promotedStableRelease, timestamp),
  };
}
