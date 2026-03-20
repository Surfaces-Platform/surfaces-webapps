import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import {
  buildDefaultReleaseName,
  buildFeedReleaseId,
  buildReleaseNotesPayload,
  createDefaultPromotionState,
  createEmptyDesktopReleaseManifest,
  createReleaseNotesFilePayload,
  parseArgs,
  upsertChannelRelease,
  writeJsonFile,
} from "./surfaceops-desktop-feed.mjs";
import {
  DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_MANIFEST_FILE,
  DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_NOTES_FILE,
  DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_PROMOTION_STATE_FILE,
  startUnsignedRehearsalStaticServer,
} from "./surfaceops-desktop-unsigned-rehearsal.mjs";
import {
  createSurfaceOpsMockRuntimeServer,
  writeSurfaceOpsModelDownloadOverrides,
} from "../../../apps/surfaceops-desktop/test-support/mock-runtime-server.mjs";

export const DEFAULT_SURFACEOPS_STAGE_A_UTM_BASE_VM = "surfaceops-macos-stage-a-base";
export const DEFAULT_SURFACEOPS_STAGE_A_UTM_SSH_HOST = "surfaceops-stage-a.local";
export const DEFAULT_SURFACEOPS_STAGE_A_UTM_SSH_USER = "surfaceops";
export const DEFAULT_SURFACEOPS_STAGE_A_UTM_HOST_PORT = 3001;
export const DEFAULT_SURFACEOPS_STAGE_A_UTM_FEED_PORT = 4173;
export const DEFAULT_SURFACEOPS_STAGE_A_UTM_RUNTIME_PORT = 4311;
export const DEFAULT_SURFACEOPS_STAGE_A_UTM_APP_SUBPATH = path.join("Applications", "SurfaceOps.app");
export const DEFAULT_SURFACEOPS_STAGE_A_UTM_DOCUMENTS_ROOT = path.join(
  os.homedir(),
  "Library",
  "Containers",
  "com.utmapp.UTM",
  "Data",
  "Documents",
);
export const DEFAULT_SURFACEOPS_STAGE_A_UTMCTL_PATH = "/Applications/UTM.app/Contents/MacOS/utmctl";

function resolvePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function asBoolean(value) {
  if (typeof value !== "string") {
    return Boolean(value);
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function toRunId(now = new Date()) {
  return new Date(now)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function shQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function normalizeMacAddress(value) {
  return String(value ?? "").trim().toLowerCase();
}

function resolveOptionalPath(value, homeDir = os.homedir()) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed === "~") {
    return homeDir;
  }
  if (trimmed.startsWith("~/")) {
    return path.join(homeDir, trimmed.slice(2));
  }
  return path.resolve(trimmed);
}

async function sha512File(filePath) {
  const buffer = await fsp.readFile(filePath);
  return {
    size: buffer.byteLength,
    sha512: crypto.createHash("sha512").update(buffer).digest("base64"),
  };
}

export function buildSurfaceOpsStageACloneName(runId) {
  return `surfaceops-macos-stage-a-${runId}`;
}

export function buildSurfaceOpsStageAFeedBaseUrl({ hostIp, port }) {
  return `http://${hostIp}:${port}`;
}

export function resolveSurfaceOpsStageAUtmConfig({
  repoRoot = process.cwd(),
  env = process.env,
  argv = process.argv.slice(2),
  now = new Date(),
} = {}) {
  const args = parseArgs(argv);
  const fromVersion = args.from ?? env.SURFACEOPS_STAGE_A_FROM_VERSION;
  const toVersion = args.to ?? env.SURFACEOPS_STAGE_A_TO_VERSION;
  if (!fromVersion || !toVersion) {
    throw new Error("Stage A UTM smoke requires both --from and --to versions.");
  }

  const runId = args["run-id"]?.trim() || toRunId(now);
  const repoArtifactsRoot = path.join(repoRoot, "artifacts", "surfaceops-desktop-stage-a", runId);

  return {
    repoRoot,
    runId,
    fromVersion,
    toVersion,
    baseVm: args["base-vm"]?.trim() || env.SURFACEOPS_STAGE_A_BASE_VM || DEFAULT_SURFACEOPS_STAGE_A_UTM_BASE_VM,
    sshHost: args["ssh-host"]?.trim() || env.SURFACEOPS_STAGE_A_SSH_HOST || DEFAULT_SURFACEOPS_STAGE_A_UTM_SSH_HOST,
    sshUser: args["ssh-user"]?.trim() || env.SURFACEOPS_STAGE_A_SSH_USER || DEFAULT_SURFACEOPS_STAGE_A_UTM_SSH_USER,
    sshKey: resolveOptionalPath(args["ssh-key"] ?? env.SURFACEOPS_STAGE_A_SSH_KEY, env.HOME || os.homedir()),
    hostIp: args["host-ip"]?.trim() || env.SURFACEOPS_STAGE_A_HOST_IP || null,
    hostPort: resolvePositiveInteger(
      args["host-port"] ?? env.SURFACEOPS_STAGE_A_HOST_PORT,
      DEFAULT_SURFACEOPS_STAGE_A_UTM_HOST_PORT,
    ),
    feedPort: resolvePositiveInteger(
      args["feed-port"] ?? env.SURFACEOPS_STAGE_A_FEED_PORT,
      DEFAULT_SURFACEOPS_STAGE_A_UTM_FEED_PORT,
    ),
    runtimePort: resolvePositiveInteger(
      args["runtime-port"] ?? env.SURFACEOPS_STAGE_A_RUNTIME_PORT,
      DEFAULT_SURFACEOPS_STAGE_A_UTM_RUNTIME_PORT,
    ),
    hostManifestPort: resolvePositiveInteger(
      args["feed-port"] ?? env.SURFACEOPS_STAGE_A_FEED_PORT,
      DEFAULT_SURFACEOPS_STAGE_A_UTM_FEED_PORT,
    ),
    artifactsDir: repoArtifactsRoot,
    downloadsDir: path.join(repoArtifactsRoot, "downloads"),
    feedDir: path.join(repoArtifactsRoot, "feed"),
    guestExchangeDir: path.join(repoArtifactsRoot, "guest-exchange"),
    logsDir: path.join(repoArtifactsRoot, "logs"),
    knownHostsFile: path.join(repoArtifactsRoot, "known_hosts"),
    previewLogFile: path.join(repoArtifactsRoot, "logs", "surfaceops-stage-a-preview.log"),
    summaryFile: path.join(repoArtifactsRoot, "stage-a-summary.json"),
    rehearsalManifestFile: path.join(
      repoArtifactsRoot,
      "feed",
      DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_MANIFEST_FILE,
    ),
    vmDocumentsRoot:
      args["utm-documents-root"]?.trim()
      || env.SURFACEOPS_STAGE_A_UTM_DOCUMENTS_ROOT
      || DEFAULT_SURFACEOPS_STAGE_A_UTM_DOCUMENTS_ROOT,
    utmctlPath: args["utmctl-path"]?.trim() || env.SURFACEOPS_STAGE_A_UTMCTL_PATH || DEFAULT_SURFACEOPS_STAGE_A_UTMCTL_PATH,
    dispatchNextRelease: asBoolean(args["dispatch-next"] ?? env.SURFACEOPS_STAGE_A_DISPATCH_NEXT ?? "0"),
    guestTmpDir: `/tmp/surfaceops-desktop-stage-a-${runId}`,
    guestAppBundlePath: `$HOME/${DEFAULT_SURFACEOPS_STAGE_A_UTM_APP_SUBPATH}`,
    guestAppBinaryPath: `$HOME/${DEFAULT_SURFACEOPS_STAGE_A_UTM_APP_SUBPATH}/Contents/MacOS/SurfaceOps`,
    guestUserDataDir: `/tmp/surfaceops-desktop-stage-a-${runId}/user-data`,
  };
}

function defaultHostIpResolver({ env = process.env, interfaces = os.networkInterfaces() } = {}) {
  const explicit = env.SURFACEOPS_STAGE_A_HOST_IP?.trim();
  if (explicit) {
    return explicit;
  }

  const preferredNames = ["en0", "en1", "bridge0", "bridge100", "bond0", "eth0"];
  const candidates = [];
  for (const [name, entries] of Object.entries(interfaces ?? {})) {
    for (const entry of entries ?? []) {
      if (entry?.family !== "IPv4" || entry.internal) {
        continue;
      }
      candidates.push({ name, address: entry.address });
    }
  }

  candidates.sort((left, right) => {
    const leftRank = preferredNames.indexOf(left.name);
    const rightRank = preferredNames.indexOf(right.name);
    return (leftRank === -1 ? 999 : leftRank) - (rightRank === -1 ? 999 : rightRank);
  });

  if (!candidates[0]?.address) {
    throw new Error("Could not determine a guest-reachable host IPv4 address. Pass --host-ip explicitly.");
  }

  return candidates[0].address;
}

function createCommandError(command, args, code, stdout, stderr) {
  return new Error([
    `${command} ${args.join(" ")} failed with exit code ${code}.`,
    stdout ? `STDOUT:\n${stdout}` : null,
    stderr ? `STDERR:\n${stderr}` : null,
  ].filter(Boolean).join("\n\n"));
}

async function runCommand(command, args, {
  cwd,
  env,
  stdin = null,
  allowFailure = false,
} = {}) {
  const child = spawn(command, args, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    stdio: "pipe",
  });

  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  if (stdin !== null) {
    child.stdin?.end(stdin);
  } else {
    child.stdin?.end();
  }

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 0));
  });

  if (exitCode !== 0 && !allowFailure) {
    throw createCommandError(command, args, exitCode, stdout, stderr);
  }

  return { code: exitCode, stdout, stderr };
}

function startBackgroundProcess(command, args, {
  cwd,
  env,
  logFile,
} = {}) {
  const child = spawn(command, args, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    stdio: "pipe",
  });

  let logStream = null;
  if (logFile) {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    logStream = fs.createWriteStream(logFile, { flags: "a" });
  }

  child.stdout?.on("data", (chunk) => {
    logStream?.write(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    logStream?.write(chunk);
  });

  const dispose = async () => {
    if (child.exitCode !== null) {
      logStream?.end();
      return;
    }

    child.kill("SIGTERM");
    await new Promise((resolve) => {
      child.once("exit", () => resolve());
      setTimeout(() => {
        if (child.exitCode === null) {
          child.kill("SIGKILL");
        }
      }, 5_000);
    });
    logStream?.end();
  };

  return { child, dispose };
}

async function waitForHttpOk(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        return;
      }
    } catch {
      // keep waiting
    }
    await wait(500);
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

function buildReleasePatterns(version) {
  const base = `SurfaceOps-${version}-arm64`;
  return [
    `${base}.dmg`,
    `${base}.zip`,
    `${base}.zip.blockmap`,
    "latest-mac.yml",
  ];
}

function stageAReleaseNotes(version) {
  return buildReleaseNotesPayload({
    version,
    releaseName: `${buildDefaultReleaseName(version)} (signed rehearsal mirror)`,
    title: `SurfaceOps Desktop ${version} (signed rehearsal mirror)`,
    summary: "Local mirror of signed rehearsal assets for automated UTM Stage A smoke coverage.",
    bullets: [
      "Uses signed rehearsal assets downloaded from GitHub Releases.",
      "Serves those assets from the local host so the VM does not require GitHub authentication.",
      "Exercises the same onboarding and updater flow as the packaged app in the guest.",
    ],
  });
}

export async function stageSurfaceOpsDesktopStageAFeed({
  stageDir,
  baseUrl,
  versions,
  now = new Date().toISOString(),
} = {}) {
  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error("Staging the SurfaceOps Stage A feed requires at least one version.");
  }

  const resolvedStageDir = path.resolve(stageDir ?? process.cwd());
  const manifestPath = path.join(resolvedStageDir, DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_MANIFEST_FILE);
  const notesPath = path.join(resolvedStageDir, DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_NOTES_FILE);
  const promotionStatePath = path.join(resolvedStageDir, DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_PROMOTION_STATE_FILE);
  let manifest = createEmptyDesktopReleaseManifest(now);
  let latestRelease = null;

  for (const version of versions) {
    const releaseDir = path.join(resolvedStageDir, "releases", version);
    const dmgPath = path.join(releaseDir, `SurfaceOps-${version}-arm64.dmg`);
    const zipPath = path.join(releaseDir, `SurfaceOps-${version}-arm64.zip`);
    await fsp.access(dmgPath);
    await fsp.access(zipPath);

    const dmg = await sha512File(dmgPath);
    const zip = await sha512File(zipPath);
    latestRelease = {
      id: buildFeedReleaseId("alpha", version),
      channel: "alpha",
      version,
      name: `${buildDefaultReleaseName(version)} (signed rehearsal mirror)`,
      publishedAt: now,
      availability: "published",
      notes: stageAReleaseNotes(version),
      platforms: {
        "darwin-arm64": {
          dmg: {
            url: `${String(baseUrl).replace(/\/+$/, "")}/releases/${encodeURIComponent(version)}/${encodeURIComponent(path.basename(dmgPath))}`,
            size: dmg.size,
            sha512: dmg.sha512,
          },
          zip: {
            url: `${String(baseUrl).replace(/\/+$/, "")}/releases/${encodeURIComponent(version)}/${encodeURIComponent(path.basename(zipPath))}`,
            size: zip.size,
            sha512: zip.sha512,
          },
        },
      },
    };
    manifest = upsertChannelRelease(manifest, latestRelease, now);
  }

  await writeJsonFile(manifestPath, manifest);
  await writeJsonFile(notesPath, createReleaseNotesFilePayload(latestRelease, now));
  await writeJsonFile(promotionStatePath, createDefaultPromotionState(now));

  return {
    latestRelease,
    manifest,
    manifestPath,
    notesPath,
    promotionStatePath,
  };
}

function extractIpv4FromArpOutput(output, macAddress) {
  const target = normalizeMacAddress(macAddress);
  const lines = String(output ?? "").split(/\r?\n/);
  for (const line of lines) {
    const normalizedLine = line.toLowerCase();
    if (!normalizedLine.includes(target)) {
      continue;
    }
    const match = line.match(/\((\d+\.\d+\.\d+\.\d+)\)/);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function extractMacAddressFromUtmConfig(rawConfig) {
  const match = String(rawConfig ?? "").match(/<key>MacAddress<\/key>\s*<string>([^<]+)<\/string>/i);
  return match?.[1] ?? null;
}

export function buildSurfaceOpsStageASshOptionArgs(config) {
  const args = [
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=5",
    "-o", "StrictHostKeyChecking=accept-new",
    "-o", `UserKnownHostsFile=${config.knownHostsFile}`,
  ];
  if (config.sshKey) {
    args.push("-o", "IdentitiesOnly=yes", "-i", config.sshKey);
  }
  return args;
}

async function runGuestScript(config, host, script, deps) {
  return deps.runCommand("ssh", [
    ...buildSurfaceOpsStageASshOptionArgs(config),
    `${config.sshUser}@${host}`,
    "bash",
    "-se",
  ], { stdin: script });
}

async function copyFileToGuest(config, host, localPath, remotePath, deps) {
  await deps.runCommand("scp", [
    ...buildSurfaceOpsStageASshOptionArgs(config),
    localPath,
    `${config.sshUser}@${host}:${remotePath}`,
  ]);
}

async function copyFileFromGuest(config, host, remotePath, localPath, deps) {
  await fsp.mkdir(path.dirname(localPath), { recursive: true });
  await deps.runCommand("scp", [
    ...buildSurfaceOpsStageASshOptionArgs(config),
    `${config.sshUser}@${host}:${remotePath}`,
    localPath,
  ]);
}

async function waitForSshTarget(config, cloneName, deps) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const probe = await deps.runCommand("ssh", [
      ...buildSurfaceOpsStageASshOptionArgs(config),
      `${config.sshUser}@${config.sshHost}`,
      "true",
    ], { allowFailure: true });
    if (probe.code === 0) {
      return config.sshHost;
    }
    await wait(2_000);
  }

  const configPath = path.join(config.vmDocumentsRoot, `${cloneName}.utm`, "config.plist");
  const rawConfig = await fsp.readFile(configPath, "utf8");
  const macAddress = extractMacAddressFromUtmConfig(rawConfig);
  if (!macAddress) {
    throw new Error(`Could not read the network MAC address from ${configPath}.`);
  }

  const arpDeadline = Date.now() + 180_000;
  while (Date.now() < arpDeadline) {
    const arp = await deps.runCommand("arp", ["-a"], { allowFailure: true });
    const guestIp = extractIpv4FromArpOutput(arp.stdout, macAddress);
    if (guestIp) {
      const probe = await deps.runCommand("ssh", [
        ...buildSurfaceOpsStageASshOptionArgs(config),
        `${config.sshUser}@${guestIp}`,
        "true",
      ], { allowFailure: true });
      if (probe.code === 0) {
        return guestIp;
      }
    }
    await wait(2_000);
  }

  throw new Error(`Timed out waiting for SSH on ${config.sshHost} or a guest IP for ${cloneName}.`);
}

function buildGuestCleanupScript(config) {
  return [
    "set -euo pipefail",
    `rm -rf ${shQuote(config.guestTmpDir)}`,
    `mkdir -p ${shQuote(config.guestTmpDir)} ${shQuote(path.dirname(config.guestAppBundlePath))}`,
    "pkill -x SurfaceOps >/dev/null 2>&1 || true",
    `rm -rf ${shQuote(config.guestAppBundlePath)}`,
    "rm -rf \"$HOME/Library/Application Support/SurfaceOps\"*",
    "rm -rf \"$HOME/Library/Caches\"/*SurfaceOps*",
    "rm -rf \"$HOME/Library/Logs\"/*SurfaceOps*",
  ].join("\n");
}

function buildGuestInstallScript(config, remoteDmgPath) {
  return [
    "set -euo pipefail",
    "mount_dir=$(mktemp -d /tmp/surfaceops-dmg-XXXXXX)",
    "trap 'hdiutil detach \"$mount_dir\" -quiet >/dev/null 2>&1 || true; rm -rf \"$mount_dir\"' EXIT",
    `hdiutil attach ${shQuote(remoteDmgPath)} -nobrowse -mountpoint "$mount_dir" -quiet`,
    `rm -rf ${shQuote(config.guestAppBundlePath)}`,
    `ditto "$mount_dir/SurfaceOps.app" ${shQuote(config.guestAppBundlePath)}`,
  ].join("\n");
}

function buildGuestLaunchScript(config, {
  hostIp,
  hostPort,
  feedPort,
  runtimePort,
  smokeConfigRemotePath,
  smokeResultRemotePath,
  overridesRemotePath,
} = {}) {
  const envEntries = {
    NEXT_TELEMETRY_DISABLED: "1",
    SURFACEOPS_DESKTOP_SMOKE_CONFIG_PATH: smokeConfigRemotePath,
    SURFACEOPS_DESKTOP_SMOKE_RESULT_PATH: smokeResultRemotePath,
    SURFACEOPS_DESKTOP_USER_DATA_DIR: config.guestUserDataDir,
    SURFACEOPS_DESKTOP_MODEL_DOWNLOAD_OVERRIDES_PATH: overridesRemotePath,
    SURFACEOPS_MODEL_BACKEND_TARGET_URL: `http://${hostIp}:${runtimePort}`,
    SURFACEOPS_UPDATE_BASE_URL: `http://${hostIp}:${hostPort}/api/desktop/updates`,
    SURFACEOPS_DESKTOP_RELEASE_MANIFEST_URL:
      `http://${hostIp}:${feedPort}/${DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_MANIFEST_FILE}`,
    SURFACEOPS_DESKTOP_TEST_PLATFORM: "darwin-arm64",
    SURFACEOPS_DESKTOP_TEST_MEMORY_GB: "24",
    SURFACEOPS_DESKTOP_TEST_CHIP: "Apple Silicon Stage A",
  };

  return [
    "set -euo pipefail",
    `mkdir -p ${shQuote(config.guestUserDataDir)}`,
    `env ${Object.entries(envEntries).map(([key, value]) => `${key}=${shQuote(value)}`).join(" ")} ${shQuote(config.guestAppBinaryPath)}`,
  ].join("\n");
}

function buildGuestVersionScript(config) {
  return [
    "set -euo pipefail",
    `/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" ${shQuote(`${config.guestAppBundlePath}/Contents/Info.plist`)}`,
  ].join("\n");
}

async function waitForInstalledVersion(config, host, version, deps) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const probe = await runGuestScript(config, host, buildGuestVersionScript(config), {
      ...deps,
    }).catch(() => null);
    if (probe?.stdout?.trim() === version) {
      return;
    }
    await wait(2_000);
  }

  throw new Error(`Timed out waiting for SurfaceOps ${version} to be installed in the guest.`);
}

function buildSmokeConfig(configPath, value) {
  return fsp.writeFile(configPath, JSON.stringify(value, null, 2), "utf8");
}

async function downloadRehearsalReleaseAssets(config, version, deps) {
  const releaseTag = `rehearsal-v${version}`;
  const releaseDir = path.join(config.feedDir, "releases", version);
  await fsp.mkdir(releaseDir, { recursive: true });

  const releaseCheck = await deps.runCommand("gh", [
    "release",
    "view",
    releaseTag,
    "--json",
    "name,tagName",
  ], { allowFailure: true });

  if (releaseCheck.code !== 0) {
    if (!config.dispatchNextRelease || version !== config.toVersion) {
      throw new Error(
        `Could not find ${releaseTag}. Publish it first with surfaceops-desktop-release-rehearsal.yml or rerun with --dispatch-next 1 for the target version.`,
      );
    }

    await deps.runCommand("gh", [
      "workflow",
      "run",
      "surfaceops-desktop-release-rehearsal.yml",
      "--ref",
      "main",
      "-f",
      `release_version=${version}`,
    ]);

    const pollDeadline = Date.now() + 20 * 60 * 1000;
    while (Date.now() < pollDeadline) {
      const poll = await deps.runCommand("gh", [
        "release",
        "view",
        releaseTag,
        "--json",
        "name,tagName",
      ], { allowFailure: true });
      if (poll.code === 0) {
        break;
      }
      await wait(15_000);
    }
  }

  const patterns = buildReleasePatterns(version);
  const args = ["release", "download", releaseTag];
  for (const pattern of patterns) {
    args.push("--pattern", pattern);
  }
  args.push("--dir", releaseDir, "--clobber");
  await deps.runCommand("gh", args);
  return {
    version,
    dmgPath: path.join(releaseDir, `SurfaceOps-${version}-arm64.dmg`),
    zipPath: path.join(releaseDir, `SurfaceOps-${version}-arm64.zip`),
    releaseDir,
  };
}

async function startPreviewServer(config, manifestUrl, deps) {
  const processHandle = deps.startBackgroundProcess("pnpm", [
    "--filter",
    "surfaceops-web",
    "exec",
    "next",
    "dev",
    "--port",
    String(config.hostPort),
    "--hostname",
    "0.0.0.0",
    "--webpack",
  ], {
    cwd: config.repoRoot,
    env: {
      SURFACEOPS_DESKTOP_RELEASE_MANIFEST_URL: manifestUrl,
    },
    logFile: config.previewLogFile,
  });

  await deps.waitForHttpOk(`http://127.0.0.1:${config.hostPort}/download`);
  await deps.waitForHttpOk(`http://127.0.0.1:${config.hostPort}/release-notes`);
  return processHandle;
}

async function startFeedMirror(config, hostIp, versions, deps) {
  for (const version of versions) {
    await downloadRehearsalReleaseAssets(config, version, deps);
  }

  const baseUrl = buildSurfaceOpsStageAFeedBaseUrl({
    hostIp,
    port: config.feedPort,
  });
  await stageSurfaceOpsDesktopStageAFeed({
    stageDir: config.feedDir,
    baseUrl,
    versions,
  });
  const serverState = await startUnsignedRehearsalStaticServer({
    rootDir: config.feedDir,
    host: "0.0.0.0",
    port: config.feedPort,
  });

  return {
    baseUrl,
    manifestUrl: `${baseUrl}/${DEFAULT_SURFACEOPS_UNSIGNED_REHEARSAL_MANIFEST_FILE}`,
    async restage(nextVersions) {
      for (const version of nextVersions) {
        await downloadRehearsalReleaseAssets(config, version, deps);
      }
      await stageSurfaceOpsDesktopStageAFeed({
        stageDir: config.feedDir,
        baseUrl,
        versions: nextVersions,
      });
    },
    async dispose() {
      if (!serverState.server) {
        return;
      }
      await new Promise((resolve, reject) => {
        serverState.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

async function startMockRuntime(config, hostIp) {
  const runtimeRoot = path.join(config.artifactsDir, "runtime");
  const serverState = await createSurfaceOpsMockRuntimeServer({
    rootDir: runtimeRoot,
    host: "0.0.0.0",
    port: config.runtimePort,
  });
  return {
    artifacts: serverState.artifacts,
    baseUrl: `http://${hostIp}:${serverState.port}`,
    async dispose() {
      serverState.server.closeIdleConnections?.();
      serverState.server.closeAllConnections?.();
      await new Promise((resolve, reject) => {
        serverState.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

function createDefaultDeps(config) {
  return {
    runCommand,
    startBackgroundProcess,
    waitForHttpOk,
    resolveHostIp() {
      return config.hostIp || defaultHostIpResolver();
    },
    async startFeedMirror(hostIp, versions) {
      return startFeedMirror(config, hostIp, versions, this);
    },
    async startPreviewServer(manifestUrl) {
      return startPreviewServer(config, manifestUrl, this);
    },
    async startMockRuntime(hostIp) {
      return startMockRuntime(config, hostIp);
    },
    async createVmClone() {
      await this.runCommand(config.utmctlPath, [
        "clone",
        config.baseVm,
        "--name",
        buildSurfaceOpsStageACloneName(config.runId),
      ]);
    },
    async startVm() {
      await this.runCommand(config.utmctlPath, [
        "start",
        buildSurfaceOpsStageACloneName(config.runId),
      ]);
    },
    async waitForSshTarget() {
      return waitForSshTarget(config, buildSurfaceOpsStageACloneName(config.runId), this);
    },
    async runGuestScript(host, script) {
      return runGuestScript(config, host, script, this);
    },
    async copyFileToGuest(host, localPath, remotePath) {
      return copyFileToGuest(config, host, localPath, remotePath, this);
    },
    async copyFileFromGuest(host, remotePath, localPath) {
      return copyFileFromGuest(config, host, remotePath, localPath, this);
    },
    async waitForInstalledVersion(host, version) {
      return waitForInstalledVersion(config, host, version, this);
    },
    async stopVm() {
      await this.runCommand(config.utmctlPath, [
        "stop",
        buildSurfaceOpsStageACloneName(config.runId),
        "--request",
      ], { allowFailure: true });
    },
    async deleteVm() {
      await this.runCommand(config.utmctlPath, [
        "delete",
        buildSurfaceOpsStageACloneName(config.runId),
      ], { allowFailure: true });
    },
  };
}

export async function runSurfaceOpsDesktopStageAUtm(config, deps = {}) {
  const resolvedDeps = { ...createDefaultDeps(config), ...deps };
  await fsp.mkdir(config.artifactsDir, { recursive: true });
  await fsp.mkdir(config.guestExchangeDir, { recursive: true });
  await fsp.mkdir(config.logsDir, { recursive: true });

  const summary = {
    ok: false,
    runId: config.runId,
    fromVersion: config.fromVersion,
    toVersion: config.toVersion,
    baseVm: config.baseVm,
    cloneVm: buildSurfaceOpsStageACloneName(config.runId),
    hostIp: null,
    guestHost: null,
    previewUrl: null,
    manifestUrl: null,
    runtimeBaseUrl: null,
    firstRunResultFile: path.join(config.artifactsDir, "first-run-result.json"),
    updaterRunResultFile: path.join(config.artifactsDir, "update-run-result.json"),
    postUpdateResultFile: path.join(config.artifactsDir, "post-update-result.json"),
    errorMessage: null,
    startedAt: new Date().toISOString(),
    promotionControl: null,
  };

  let feedMirror = null;
  let previewServer = null;
  let runtimeServer = null;
  let guestHost = null;
  let cloneCreated = false;

  try {
    summary.hostIp = await resolvedDeps.resolveHostIp();
    feedMirror = await resolvedDeps.startFeedMirror(summary.hostIp, [config.fromVersion]);
    summary.manifestUrl = feedMirror.manifestUrl;
    previewServer = await resolvedDeps.startPreviewServer(feedMirror.manifestUrl);
    summary.previewUrl = `http://${summary.hostIp}:${config.hostPort}`;

    runtimeServer = await resolvedDeps.startMockRuntime(summary.hostIp);
    summary.runtimeBaseUrl = runtimeServer.baseUrl;

    const overridesLocalPath = path.join(config.guestExchangeDir, "model-download-overrides.json");
    await writeSurfaceOpsModelDownloadOverrides({
      filePath: overridesLocalPath,
      baseUrl: runtimeServer.baseUrl,
      artifacts: runtimeServer.artifacts,
    });

    await resolvedDeps.createVmClone();
    cloneCreated = true;
    await resolvedDeps.startVm();
    guestHost = await resolvedDeps.waitForSshTarget();
    summary.guestHost = guestHost;

    await resolvedDeps.runGuestScript(guestHost, buildGuestCleanupScript(config));

    const fromDmgLocalPath = path.join(config.feedDir, "releases", config.fromVersion, `SurfaceOps-${config.fromVersion}-arm64.dmg`);
    const remoteFromDmgPath = `${config.guestTmpDir}/SurfaceOps-${config.fromVersion}-arm64.dmg`;
    await resolvedDeps.copyFileToGuest(guestHost, fromDmgLocalPath, remoteFromDmgPath);
    await resolvedDeps.copyFileToGuest(
      guestHost,
      overridesLocalPath,
      `${config.guestTmpDir}/model-download-overrides.json`,
    );
    await resolvedDeps.runGuestScript(guestHost, buildGuestInstallScript(config, remoteFromDmgPath));

    const firstRunConfigLocalPath = path.join(config.guestExchangeDir, "first-run-config.json");
    const firstRunRemoteConfigPath = `${config.guestTmpDir}/first-run-config.json`;
    const firstRunRemoteResultPath = `${config.guestTmpDir}/first-run-result.json`;
    await buildSmokeConfig(firstRunConfigLocalPath, {
      resultLabel: "first-run",
      expectedInitialPath: "/desktop/setup",
      expectedWorkbenchPath: "/contracts/governance",
      installModelId: "balanced",
      runBenchmark: true,
      replaceModelId: "starter",
      expectedFinalPath: "/contracts/governance",
      exitWhenDone: true,
      timeoutMs: 180_000,
    });
    await resolvedDeps.copyFileToGuest(guestHost, firstRunConfigLocalPath, firstRunRemoteConfigPath);
    await resolvedDeps.runGuestScript(guestHost, buildGuestLaunchScript(config, {
      hostIp: summary.hostIp,
      hostPort: config.hostPort,
      feedPort: config.feedPort,
      runtimePort: config.runtimePort,
      smokeConfigRemotePath: firstRunRemoteConfigPath,
      smokeResultRemotePath: firstRunRemoteResultPath,
      overridesRemotePath: `${config.guestTmpDir}/model-download-overrides.json`,
    }));
    await resolvedDeps.copyFileFromGuest(
      guestHost,
      firstRunRemoteResultPath,
      summary.firstRunResultFile,
    );

    await feedMirror.restage([config.fromVersion, config.toVersion]);

    const updateRunConfigLocalPath = path.join(config.guestExchangeDir, "update-run-config.json");
    const updateRunRemoteConfigPath = `${config.guestTmpDir}/update-run-config.json`;
    const updateRunRemoteResultPath = `${config.guestTmpDir}/update-run-result.json`;
    await buildSmokeConfig(updateRunConfigLocalPath, {
      resultLabel: "update-run",
      expectedInitialPath: "/contracts/governance",
      checkForUpdates: true,
      waitForDownloadedVersion: config.toVersion,
      restartToUpdate: true,
      exitWhenDone: true,
      timeoutMs: 180_000,
    });
    await resolvedDeps.copyFileToGuest(guestHost, updateRunConfigLocalPath, updateRunRemoteConfigPath);
    await resolvedDeps.runGuestScript(guestHost, buildGuestLaunchScript(config, {
      hostIp: summary.hostIp,
      hostPort: config.hostPort,
      feedPort: config.feedPort,
      runtimePort: config.runtimePort,
      smokeConfigRemotePath: updateRunRemoteConfigPath,
      smokeResultRemotePath: updateRunRemoteResultPath,
      overridesRemotePath: `${config.guestTmpDir}/model-download-overrides.json`,
    }));
    await resolvedDeps.copyFileFromGuest(
      guestHost,
      updateRunRemoteResultPath,
      summary.updaterRunResultFile,
    );

    await resolvedDeps.waitForInstalledVersion(guestHost, config.toVersion);

    const postUpdateConfigLocalPath = path.join(config.guestExchangeDir, "post-update-config.json");
    const postUpdateRemoteConfigPath = `${config.guestTmpDir}/post-update-config.json`;
    const postUpdateRemoteResultPath = `${config.guestTmpDir}/post-update-result.json`;
    await buildSmokeConfig(postUpdateConfigLocalPath, {
      resultLabel: "post-update",
      expectedInitialPath: "/contracts/governance",
      expectedVersionAfterRestart: config.toVersion,
      exitWhenDone: true,
      timeoutMs: 120_000,
    });
    await resolvedDeps.copyFileToGuest(guestHost, postUpdateConfigLocalPath, postUpdateRemoteConfigPath);
    await resolvedDeps.runGuestScript(guestHost, buildGuestLaunchScript(config, {
      hostIp: summary.hostIp,
      hostPort: config.hostPort,
      feedPort: config.feedPort,
      runtimePort: config.runtimePort,
      smokeConfigRemotePath: postUpdateRemoteConfigPath,
      smokeResultRemotePath: postUpdateRemoteResultPath,
      overridesRemotePath: `${config.guestTmpDir}/model-download-overrides.json`,
    }));
    await resolvedDeps.copyFileFromGuest(
      guestHost,
      postUpdateRemoteResultPath,
      summary.postUpdateResultFile,
    );

    summary.ok = true;
  } catch (error) {
    summary.errorMessage = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    if (cloneCreated) {
      await resolvedDeps.stopVm().catch(() => {});
      await resolvedDeps.deleteVm().catch(() => {});
    }
    await runtimeServer?.dispose?.().catch(() => {});
    await previewServer?.dispose?.().catch(() => {});
    await feedMirror?.dispose?.().catch(() => {});
    summary.completedAt = new Date().toISOString();
    await writeJsonFile(config.summaryFile, summary);
  }

  return summary;
}
