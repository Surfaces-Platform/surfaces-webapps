import { DEFAULT_UPDATE_BASE_URL } from "@surfaces/surfaceops-desktop-bridge";

export type DesktopReleaseChannel = "alpha" | "stable";
export type DesktopReleasePlatform = "darwin-arm64";
export type DesktopArtifactKind = "dmg" | "zip";
export type DesktopReleaseAvailability = "managed" | "published";

export interface DesktopReleaseArtifact {
  url: string | null;
  size: number | null;
  sha512: string | null;
}

export interface DesktopReleaseNotesPayload {
  title: string;
  summary: string;
  bullets: string[];
}

export interface DesktopRelease {
  id: string;
  channel: DesktopReleaseChannel;
  version: string;
  name: string;
  publishedAt: string;
  availability: DesktopReleaseAvailability;
  notes: DesktopReleaseNotesPayload;
  platforms: Record<DesktopReleasePlatform, {
    dmg: DesktopReleaseArtifact;
    zip: DesktopReleaseArtifact;
  }>;
}

export interface DesktopChannelReleaseManifest {
  channel: DesktopReleaseChannel;
  promotedReleaseId: string | null;
  releases: DesktopRelease[];
}

export interface DesktopReleaseManifest {
  generatedAt: string;
  channels: Record<DesktopReleaseChannel, DesktopChannelReleaseManifest>;
}

export const SUPPORTED_DESKTOP_PLATFORMS: DesktopReleasePlatform[] = ["darwin-arm64"];
export const DEFAULT_DESKTOP_RELEASE_MANIFEST_URL =
  "https://github.com/Surfaces-Platform/surfaces-webapps/releases/download/surfaceops-desktop-feed/surfaceops-desktop-release-manifest.json";

export const DEFAULT_DESKTOP_RELEASE_MANIFEST: DesktopReleaseManifest = {
  generatedAt: "2026-03-16T00:00:00.000Z",
  channels: {
    alpha: {
      channel: "alpha",
      promotedReleaseId: "desktop-alpha-0.1.0",
      releases: [
        {
          id: "desktop-alpha-0.1.0",
          channel: "alpha",
          version: "0.1.0",
          name: "SurfaceOps Desktop 0.1.0",
          publishedAt: "2026-03-16T00:00:00.000Z",
          availability: "published",
          notes: {
            title: "SurfaceOps Desktop 0.1.0",
            summary: "The public alpha release line is wired through the same canonical manifest that powers downloads, release notes, and desktop updates.",
            bullets: [
              "Clean semver tags publish the public alpha channel immediately.",
              "Stable promotion reuses the same signed binary after a 72-hour soak.",
              "The desktop app defaults to alpha on first install and can switch channels in-app.",
            ],
          },
          platforms: {
            "darwin-arm64": {
              dmg: { url: null, size: null, sha512: null },
              zip: { url: null, size: null, sha512: null },
            },
          },
        },
      ],
    },
    stable: {
      channel: "stable",
      promotedReleaseId: null,
      releases: [],
    },
  },
};

function resolveDesktopReleaseManifestUrl(): string | null {
  const explicitManifestUrl = process.env.SURFACEOPS_DESKTOP_RELEASE_MANIFEST_URL?.trim();
  if (explicitManifestUrl) {
    return explicitManifestUrl;
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_DESKTOP_RELEASE_MANIFEST_URL;
  }

  return null;
}

function cloneManifest(manifest: DesktopReleaseManifest): DesktopReleaseManifest {
  return JSON.parse(JSON.stringify(manifest)) as DesktopReleaseManifest;
}

function isDesktopReleaseChannel(value: string): value is DesktopReleaseChannel {
  return value === "alpha" || value === "stable";
}

function isDesktopReleasePlatform(value: string): value is DesktopReleasePlatform {
  return SUPPORTED_DESKTOP_PLATFORMS.includes(value as DesktopReleasePlatform);
}

function normalizeManifest(candidate: unknown): DesktopReleaseManifest | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const manifest = candidate as Partial<DesktopReleaseManifest>;
  if (!manifest.channels || typeof manifest.channels !== "object") {
    return null;
  }

  for (const channel of ["alpha", "stable"] as const) {
    const channelEntry = manifest.channels[channel];
    if (!channelEntry || typeof channelEntry !== "object" || !Array.isArray(channelEntry.releases)) {
      return null;
    }
  }

  return manifest as DesktopReleaseManifest;
}

export async function loadDesktopReleaseManifest(): Promise<DesktopReleaseManifest> {
  const manifestUrl = resolveDesktopReleaseManifestUrl();
  if (!manifestUrl) {
    return cloneManifest(DEFAULT_DESKTOP_RELEASE_MANIFEST);
  }

  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Manifest fetch failed with ${response.status}.`);
    }
    const candidate = await response.json();
    const normalized = normalizeManifest(candidate);
    if (!normalized) {
      throw new Error("Manifest payload is invalid.");
    }
    return normalized;
  } catch {
    return cloneManifest(DEFAULT_DESKTOP_RELEASE_MANIFEST);
  }
}

export function getDesktopChannelManifest(
  manifest: DesktopReleaseManifest,
  channel: DesktopReleaseChannel,
): DesktopChannelReleaseManifest {
  return manifest.channels[channel];
}

export function getPromotedDesktopRelease(
  manifest: DesktopReleaseManifest,
  channel: DesktopReleaseChannel,
): DesktopRelease | null {
  const channelManifest = getDesktopChannelManifest(manifest, channel);
  if (!channelManifest.promotedReleaseId) {
    return null;
  }

  return channelManifest.releases.find((release) => release.id === channelManifest.promotedReleaseId) ?? null;
}

export function getAllDesktopReleases(manifest: DesktopReleaseManifest): DesktopRelease[] {
  return (["alpha", "stable"] as const)
    .flatMap((channel) => manifest.channels[channel].releases)
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

export function buildDesktopUpdateAssetPath(
  channel: DesktopReleaseChannel,
  platform: DesktopReleasePlatform,
  asset: string,
): string {
  return `/api/desktop/updates/${channel}/${platform}/${asset}`;
}

export function resolveDesktopArtifact(
  release: DesktopRelease,
  platform: DesktopReleasePlatform,
  kind: DesktopArtifactKind,
): DesktopReleaseArtifact | null {
  if (!isDesktopReleasePlatform(platform)) {
    return null;
  }

  const platformEntry = release.platforms[platform];
  return platformEntry?.[kind] ?? null;
}

export function buildDesktopUpdateBaseUrl(channel: DesktopReleaseChannel, platform: DesktopReleasePlatform): string {
  return `${(process.env.SURFACEOPS_UPDATE_BASE_URL ?? DEFAULT_UPDATE_BASE_URL).replace(/\/+$/, "")}/${channel}/${platform}`;
}

export function buildDesktopLatestMacYml(
  release: DesktopRelease,
  channel: DesktopReleaseChannel,
  platform: DesktopReleasePlatform,
): string | null {
  const zipArtifact = resolveDesktopArtifact(release, platform, "zip");
  if (!zipArtifact?.sha512) {
    return null;
  }

  const path = "download.zip";
  const releaseNotes = [
    release.notes.title,
    "",
    release.notes.summary,
    ...release.notes.bullets.map((bullet) => `- ${bullet}`),
  ].join("\n");

  return [
    `version: ${release.version}`,
    `releaseDate: ${release.publishedAt}`,
    `releaseName: ${JSON.stringify(release.name)}`,
    `releaseNotes: ${JSON.stringify(releaseNotes)}`,
    "files:",
    `  - url: ${path}`,
    `    sha512: ${zipArtifact.sha512}`,
    ...(typeof zipArtifact.size === "number" ? [`    size: ${zipArtifact.size}`] : []),
    `path: ${path}`,
    `sha512: ${zipArtifact.sha512}`,
    `channel: ${channel}`,
    `platform: ${platform}`,
  ].join("\n");
}

export function parseDesktopReleaseChannel(value: string): DesktopReleaseChannel | null {
  return isDesktopReleaseChannel(value) ? value : null;
}

export function parseDesktopReleasePlatform(value: string): DesktopReleasePlatform | null {
  return isDesktopReleasePlatform(value) ? value : null;
}
