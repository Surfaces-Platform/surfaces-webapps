import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  buildDefaultReleaseName,
  buildFeedReleaseId,
  buildReleaseNotesPayload,
  createEmptyDesktopReleaseManifest,
  createReleaseNotesFilePayload,
  parseArgs,
  upsertChannelRelease,
} from "./lib/surfaceops-desktop-feed.mjs";

async function fileMetadata(filePath) {
  const buffer = await fs.readFile(filePath);
  const sha512 = crypto.createHash("sha512").update(buffer).digest("base64");
  return {
    size: buffer.byteLength,
    sha512,
  };
}

async function loadExistingManifest(filePath) {
  if (!filePath) {
    return createEmptyDesktopReleaseManifest();
  }

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return createEmptyDesktopReleaseManifest();
  }
}

async function loadReleaseJson(filePath) {
  if (!filePath) {
    return null;
  }

  const raw = await fs.readFile(path.resolve(filePath), "utf8");
  return JSON.parse(raw);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const required = [
    "channel",
    "version",
    "dmg-file",
    "dmg-url",
    "zip-file",
    "zip-url",
    "out",
    "notes-out",
  ];
  for (const key of required) {
    if (!args[key]) {
      throw new Error(`Missing required argument --${key}`);
    }
  }

  const releaseJson = await loadReleaseJson(args["release-json-file"]);
  const releaseName = args["release-name"] ?? releaseJson?.name ?? buildDefaultReleaseName(args.version);
  const publishedAt = args["published-at"] ?? releaseJson?.publishedAt ?? new Date().toISOString();
  const manifest = await loadExistingManifest(args["existing-manifest"]);
  const dmg = await fileMetadata(path.resolve(args["dmg-file"]));
  const zip = await fileMetadata(path.resolve(args["zip-file"]));
  const bullets = (args["notes-bullets"] ?? "")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const releaseId = args["release-id"] ?? buildFeedReleaseId(args.channel, args.version);
  const notes = buildReleaseNotesPayload({
    version: args.version,
    releaseName,
    releaseBody: releaseJson?.body ?? "",
    title: args["notes-title"] ?? null,
    summary: args["notes-summary"] ?? null,
    bullets,
  });

  const release = {
    id: releaseId,
    channel: args.channel,
    version: args.version,
    name: releaseName,
    publishedAt,
    availability: "published",
    notes,
    platforms: {
      "darwin-arm64": {
        dmg: {
          url: args["dmg-url"],
          size: dmg.size,
          sha512: dmg.sha512,
        },
        zip: {
          url: args["zip-url"],
          size: zip.size,
          sha512: zip.sha512,
        },
      },
    },
  };

  const nextManifest = upsertChannelRelease(manifest, release, new Date().toISOString());

  await fs.mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
  await fs.writeFile(path.resolve(args.out), JSON.stringify(nextManifest, null, 2), "utf8");
  await fs.writeFile(
    path.resolve(args["notes-out"]),
    JSON.stringify(createReleaseNotesFilePayload(release, nextManifest.generatedAt), null, 2),
    "utf8",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
