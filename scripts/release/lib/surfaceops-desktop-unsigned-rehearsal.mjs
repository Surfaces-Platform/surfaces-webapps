import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import {
  buildDefaultReleaseName,
  buildFeedReleaseId,
  buildReleaseNotesPayload,
  createDefaultPromotionState,
  createEmptyDesktopReleaseManifest,
  createReleaseNotesFilePayload,
  loadJsonFile,
  upsertChannelRelease,
  writeJsonFile,
} from "./surfaceops-desktop-feed.mjs";

export const DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_HOST = "127.0.0.1";
export const DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_PORT = 4173;
export const DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_STAGE_RELATIVE_DIR = path.join(
  "artifacts",
  "surfaceops-desktop-unsigned-rehearsal",
);
export const DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_MANIFEST_FILE = "surfaceops-desktop-release-manifest.json";
export const DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_NOTES_FILE = "surfaceops-desktop-release-notes.json";
export const DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_PROMOTION_STATE_FILE = "surfaceops-desktop-promotion-state.json";

function resolvePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
}

async function fileMetadata(filePath) {
  const buffer = await fsp.readFile(filePath);
  const sha512 = crypto.createHash("sha512").update(buffer).digest("base64");
  return {
    size: buffer.byteLength,
    sha512,
  };
}

async function copyArtifactIfPresent(sourcePath, targetPath) {
  try {
    await fsp.access(sourcePath);
  } catch {
    return false;
  }

  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  await fsp.copyFile(sourcePath, targetPath);
  return true;
}

function contentTypeFor(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".json":
      return "application/json; charset=utf-8";
    case ".zip":
      return "application/zip";
    case ".dmg":
      return "application/x-apple-diskimage";
    case ".blockmap":
      return "application/octet-stream";
    case ".yml":
    case ".yaml":
      return "text/yaml; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function buildUnsignedRehearsalReleaseNotes(version) {
  return buildReleaseNotesPayload({
    version,
    releaseName: `${buildDefaultReleaseName(version)} (unsigned rehearsal)`,
    title: `SurfaceOps Desktop ${version} (unsigned rehearsal)`,
    summary: "Unsigned local engineering rehearsal for SurfaceOps desktop packaging and updater validation.",
    bullets: [
      "Uses only locally staged unsigned DMG and ZIP artifacts.",
      "Does not publish to GitHub Releases or canonical surfaceops.ai feeds.",
      "Does not satisfy the signed launch rehearsal or public alpha release gate.",
    ],
  });
}

function resolveArtifactBaseName(version) {
  return `SurfaceOps-${version}-arm64`;
}

export function buildUnsignedRehearsalBaseUrl({
  host = DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_HOST,
  port = DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_PORT,
} = {}) {
  return `http://${host}:${port}`;
}

export function buildUnsignedRehearsalManifestUrl(baseUrl) {
  return `${String(baseUrl).replace(/\/+$/, "")}/${DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_MANIFEST_FILE}`;
}

export function resolveUnsignedRehearsalConfig({
  repoRoot = process.cwd(),
  env = process.env,
} = {}) {
  const host = env.SURFACEOPS_UNSIGNED_REHEARSAL_HOST?.trim() || DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_HOST;
  const port = resolvePositiveInteger(
    env.SURFACEOPS_UNSIGNED_REHEARSAL_PORT,
    DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_PORT,
  );
  const stageDir = path.resolve(
    repoRoot,
    env.SURFACEOPS_UNSIGNED_REHEARSAL_DIR?.trim() || DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_STAGE_RELATIVE_DIR,
  );
  const baseUrl = env.SURFACEOPS_UNSIGNED_REHEARSAL_BASE_URL?.trim() || buildUnsignedRehearsalBaseUrl({ host, port });
  const manifestFile = path.join(stageDir, DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_MANIFEST_FILE);
  const notesFile = path.join(stageDir, DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_NOTES_FILE);
  const promotionStateFile = path.join(stageDir, DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_PROMOTION_STATE_FILE);

  return {
    host,
    port,
    stageDir,
    baseUrl,
    manifestUrl: buildUnsignedRehearsalManifestUrl(baseUrl),
    manifestFile,
    notesFile,
    promotionStateFile,
  };
}

export async function ensureUnsignedRehearsalManifestExists(config) {
  try {
    await fsp.access(config.manifestFile);
    return;
  } catch {
    throw new Error(
      `Unsigned rehearsal manifest is missing at ${config.manifestFile}. Build a versioned local artifact first, then run pnpm surfaceops:unsigned-rehearsal:stage -- --version <version>.`,
    );
  }
}

export async function stageUnsignedRehearsal({
  repoRoot = process.cwd(),
  version,
  channel = "alpha",
  distDir = path.join(repoRoot, "apps", "surfaceops-desktop", "dist"),
  outDir = null,
  baseUrl = null,
  publishedAt = new Date().toISOString(),
} = {}) {
  if (!version) {
    throw new Error("Staging an unsigned rehearsal requires a version.");
  }

  const resolvedOutDir = path.resolve(
    outDir || path.join(repoRoot, DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_STAGE_RELATIVE_DIR),
  );
  const resolvedBaseUrl =
    String(baseUrl ?? buildUnsignedRehearsalBaseUrl()).replace(/\/+$/, "");
  const artifactBaseName = resolveArtifactBaseName(version);
  const dmgSource = path.resolve(distDir, `${artifactBaseName}.dmg`);
  const zipSource = path.resolve(distDir, `${artifactBaseName}.zip`);

  try {
    await fsp.access(dmgSource);
    await fsp.access(zipSource);
  } catch {
    throw new Error(
      `Expected local unsigned artifacts for ${version} at ${dmgSource} and ${zipSource}. Build them first with SURFACEOPS_DESKTOP_RELEASE_VERSION=${version} pnpm --filter surfaceops-desktop dist:mac.`,
    );
  }

  const releaseDir = path.join(resolvedOutDir, "releases", version);
  await fsp.mkdir(releaseDir, { recursive: true });

  const dmgTarget = path.join(releaseDir, path.basename(dmgSource));
  const zipTarget = path.join(releaseDir, path.basename(zipSource));
  await fsp.copyFile(dmgSource, dmgTarget);
  await fsp.copyFile(zipSource, zipTarget);
  await copyArtifactIfPresent(`${dmgSource}.blockmap`, `${dmgTarget}.blockmap`);
  await copyArtifactIfPresent(`${zipSource}.blockmap`, `${zipTarget}.blockmap`);

  const manifestPath = path.join(resolvedOutDir, DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_MANIFEST_FILE);
  const notesPath = path.join(resolvedOutDir, DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_NOTES_FILE);
  const promotionStatePath = path.join(
    resolvedOutDir,
    DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_PROMOTION_STATE_FILE,
  );

  const currentManifest = await loadJsonFile(
    manifestPath,
    () => createEmptyDesktopReleaseManifest(publishedAt),
  );
  const currentPromotionState = await loadJsonFile(
    promotionStatePath,
    () => createDefaultPromotionState(publishedAt),
  );
  const dmg = await fileMetadata(dmgTarget);
  const zip = await fileMetadata(zipTarget);
  const dmgUrl = `${resolvedBaseUrl}/releases/${encodeURIComponent(version)}/${encodeURIComponent(path.basename(dmgTarget))}`;
  const zipUrl = `${resolvedBaseUrl}/releases/${encodeURIComponent(version)}/${encodeURIComponent(path.basename(zipTarget))}`;
  const release = {
    id: buildFeedReleaseId(channel, version),
    channel,
    version,
    name: `${buildDefaultReleaseName(version)} (unsigned rehearsal)`,
    publishedAt,
    availability: "published",
    notes: buildUnsignedRehearsalReleaseNotes(version),
    platforms: {
      "darwin-arm64": {
        dmg: {
          url: dmgUrl,
          size: dmg.size,
          sha512: dmg.sha512,
        },
        zip: {
          url: zipUrl,
          size: zip.size,
          sha512: zip.sha512,
        },
      },
    },
  };

  const nextManifest = upsertChannelRelease(currentManifest, release, publishedAt);
  const notesPayload = createReleaseNotesFilePayload(release, nextManifest.generatedAt);

  await writeJsonFile(manifestPath, nextManifest);
  await writeJsonFile(notesPath, notesPayload);
  await writeJsonFile(promotionStatePath, currentPromotionState);

  return {
    baseUrl: resolvedBaseUrl,
    manifestPath,
    notesPath,
    promotionStatePath,
    releaseDir,
    release,
  };
}

export async function startUnsignedRehearsalStaticServer({
  rootDir,
  host = DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_HOST,
  port = DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_PORT,
  allowPortInUse = false,
} = {}) {
  const resolvedRootDir = path.resolve(rootDir ?? process.cwd());

  return await new Promise((resolve, reject) => {
    let settled = false;
    const server = http.createServer(async (request, response) => {
      const method = request.method ?? "GET";
      if (method !== "GET" && method !== "HEAD") {
        response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
        response.end("Method Not Allowed");
        return;
      }

      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const relativePath = requestUrl.pathname === "/"
        ? DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_MANIFEST_FILE
        : decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
      const candidatePath = path.resolve(resolvedRootDir, relativePath);
      const relativeToRoot = path.relative(resolvedRootDir, candidatePath);

      if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
        response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
        response.end("Forbidden");
        return;
      }

      let stats;
      try {
        stats = await fsp.stat(candidatePath);
      } catch {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not Found");
        return;
      }

      if (!stats.isFile()) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not Found");
        return;
      }

      response.writeHead(200, {
        "cache-control": "no-store",
        "content-length": String(stats.size),
        "content-type": contentTypeFor(candidatePath),
      });

      if (method === "HEAD") {
        response.end();
        return;
      }

      const stream = fs.createReadStream(candidatePath);
      stream.on("error", () => {
        if (!response.headersSent) {
          response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        }
        response.end("Failed to read file");
      });
      stream.pipe(response);
    });

    server.on("error", (error) => {
      if (allowPortInUse && error && error.code === "EADDRINUSE") {
        settled = true;
        resolve({
          server: null,
          reusedExisting: true,
          host,
          port,
          rootDir: resolvedRootDir,
          baseUrl: buildUnsignedRehearsalBaseUrl({ host, port }),
        });
        return;
      }

      if (!settled) {
        settled = true;
        reject(error);
      }
    });

    server.listen(port, host, () => {
      if (settled) {
        return;
      }

      const address = server.address();
      const actualPort = typeof address === "object" && address?.port ? address.port : port;
      settled = true;
      resolve({
        server,
        reusedExisting: false,
        host,
        port: actualPort,
        rootDir: resolvedRootDir,
        baseUrl: buildUnsignedRehearsalBaseUrl({ host, port: actualPort }),
      });
    });
  });
}

export async function waitForUnsignedRehearsalServer(url, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (response.ok) {
        return;
      }
    } catch {
      // server still starting
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(`Timed out waiting for unsigned rehearsal server at ${url}`);
}
