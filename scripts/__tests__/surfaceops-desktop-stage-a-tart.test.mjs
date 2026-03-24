import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildSurfaceOpsStageASshOptionArgs,
  buildSurfaceOpsStageACloneName,
  resolveSurfaceOpsStageATartConfig,
  runSurfaceOpsDesktopStageATart,
  stageSurfaceOpsDesktopStageAFeed,
} from "../release/lib/surfaceops-desktop-stage-a-tart.mjs";

test("resolveSurfaceOpsStageATartConfig applies defaults and stable artifact paths", () => {
  const config = resolveSurfaceOpsStageATartConfig({
    repoRoot: "/repo",
    argv: ["--from", "0.1.0-rc.1", "--to", "0.1.0-rc.2", "--run-id", "20260320T170000Z"],
  });

  assert.equal(config.baseVm, "surfaceops-stage-a-base");
  assert.equal(config.sshHost, "surfaceops-stage-a.local");
  assert.equal(config.sshUser, "surfaceops");
  assert.equal(config.sshKey, null);
  assert.equal(config.tartPath, "tart");
  assert.equal(config.hostPort, 3001);
  assert.equal(config.feedPort, 4173);
  assert.equal(config.runtimePort, 4311);
  assert.equal(config.artifactsDir, "/repo/artifacts/surfaceops-desktop-stage-a/20260320T170000Z");
  assert.equal(config.guestTmpDir, "/tmp/surfaceops-desktop-stage-a-20260320T170000Z");
  assert.equal(buildSurfaceOpsStageACloneName(config.runId), "surfaceops-stage-a-20260320T170000Z");
});

test("resolveSurfaceOpsStageATartConfig prefers an explicit ssh key and expands home-relative paths", () => {
  const config = resolveSurfaceOpsStageATartConfig({
    repoRoot: "/repo",
    env: {
      HOME: "/Users/surfaceops",
      SURFACEOPS_STAGE_A_SSH_KEY: "~/ignored-by-cli",
    },
    argv: [
      "--from",
      "0.1.0-rc.1",
      "--to",
      "0.1.0-rc.2",
      "--ssh-key",
      "~/keys/stage-a",
    ],
  });

  assert.equal(config.sshKey, "/Users/surfaceops/keys/stage-a");
});

test("buildSurfaceOpsStageASshOptionArgs includes the explicit identity when configured", () => {
  const options = buildSurfaceOpsStageASshOptionArgs({
    knownHostsFile: "/tmp/known_hosts",
    sshKey: "/Users/surfaceops/.ssh/stage-a",
  });

  assert.deepEqual(options, [
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=5",
    "-o", "StrictHostKeyChecking=accept-new",
    "-o", "UserKnownHostsFile=/tmp/known_hosts",
    "-o", "IdentitiesOnly=yes",
    "-i", "/Users/surfaceops/.ssh/stage-a",
  ]);
});

test("stageSurfaceOpsDesktopStageAFeed publishes a local manifest that promotes the latest version", async () => {
  const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-stage-a-feed-"));

  try {
    for (const version of ["0.1.0-rc.1", "0.1.0-rc.2"]) {
      const releaseDir = path.join(sandbox, "releases", version);
      await fsp.mkdir(releaseDir, { recursive: true });
      await fsp.writeFile(path.join(releaseDir, `SurfaceOps-${version}-arm64.dmg`), `dmg-${version}`);
      await fsp.writeFile(path.join(releaseDir, `SurfaceOps-${version}-arm64.zip`), `zip-${version}`);
    }

    const result = await stageSurfaceOpsDesktopStageAFeed({
      stageDir: sandbox,
      baseUrl: "http://192.168.0.10:4173",
      versions: ["0.1.0-rc.1", "0.1.0-rc.2"],
      now: "2026-03-20T17:00:00.000Z",
    });

    assert.equal(result.manifest.channels.alpha.promotedReleaseId, "desktop-alpha-0.1.0-rc.2");
    assert.equal(result.latestRelease.version, "0.1.0-rc.2");
    assert.match(
      result.latestRelease.platforms["darwin-arm64"].zip.url,
      /http:\/\/192\.168\.0\.10:4173\/releases\/0\.1\.0-rc\.2\/SurfaceOps-0\.1\.0-rc\.2-arm64\.zip$/,
    );
    assert.equal(fs.existsSync(path.join(sandbox, "surfaceops-desktop-release-manifest.json")), true);
    assert.equal(fs.existsSync(path.join(sandbox, "surfaceops-desktop-release-notes.json")), true);
  } finally {
    await fsp.rm(sandbox, { recursive: true, force: true });
  }
});

test("runSurfaceOpsDesktopStageATart deletes the clone and writes summary evidence on failure", async () => {
  const repoRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-stage-a-run-"));
  const config = resolveSurfaceOpsStageATartConfig({
    repoRoot,
    argv: ["--from", "0.1.0-rc.1", "--to", "0.1.0-rc.2", "--run-id", "20260320T171500Z"],
  });

  const calls = [];

  try {
    await assert.rejects(
      () => runSurfaceOpsDesktopStageATart(config, {
        async resolveHostIp() {
          return "192.168.64.2";
        },
        async startFeedMirror() {
          const releaseDir = path.join(config.feedDir, "releases", config.fromVersion);
          await fsp.mkdir(releaseDir, { recursive: true });
          await fsp.writeFile(path.join(releaseDir, `SurfaceOps-${config.fromVersion}-arm64.dmg`), "dmg");
          await fsp.writeFile(path.join(releaseDir, `SurfaceOps-${config.fromVersion}-arm64.zip`), "zip");
          return {
            manifestUrl: "http://192.168.64.2:4173/surfaceops-desktop-release-manifest.json",
            async restage() {},
            async dispose() {
              calls.push("dispose-feed");
            },
          };
        },
        async startPreviewServer() {
          return {
            async dispose() {
              calls.push("dispose-preview");
            },
          };
        },
        async startMockRuntime() {
          return {
            baseUrl: "http://192.168.64.2:4311",
            artifacts: {
              starter: { filename: "starter.gguf", sha256: "a", sizeBytes: 1 },
              balanced: { filename: "balanced.gguf", sha256: "b", sizeBytes: 1 },
              quality: { filename: "quality.gguf", sha256: "c", sizeBytes: 1 },
            },
            async dispose() {
              calls.push("dispose-runtime");
            },
          };
        },
        async createVmClone() {
          calls.push("clone");
        },
        async startVm() {
          calls.push("start");
        },
        async waitForSshTarget() {
          return "192.168.64.7";
        },
        async runGuestScript() {
          calls.push("guest");
          throw new Error("simulated guest failure");
        },
        async copyFileToGuest() {},
        async copyFileFromGuest() {},
        async waitForInstalledVersion() {},
        async stopVm() {
          calls.push("stop");
        },
        async deleteVm() {
          calls.push("delete");
        },
      }),
      /simulated guest failure/,
    );

    const summary = JSON.parse(await fsp.readFile(config.summaryFile, "utf8"));
    assert.equal(summary.ok, false);
    assert.match(summary.errorMessage, /simulated guest failure/);
    assert.deepEqual(
      calls,
      ["clone", "start", "guest", "stop", "delete", "dispose-runtime", "dispose-preview", "dispose-feed"],
    );
  } finally {
    await fsp.rm(repoRoot, { recursive: true, force: true });
  }
});

test("runSurfaceOpsDesktopStageATart composes tart lifecycle commands through default deps", async () => {
  const repoRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-stage-a-cmds-"));
  const config = resolveSurfaceOpsStageATartConfig({
    repoRoot,
    argv: ["--from", "0.1.0-rc.1", "--to", "0.1.0-rc.2", "--run-id", "20260320T173000Z"],
  });
  const calls = [];

  try {
    await assert.rejects(
      () => runSurfaceOpsDesktopStageATart(config, {
        async runCommand(command, args, options = {}) {
          calls.push({ type: "run", command, args, options });
          if (command === "tart" && args[0] === "ip") {
            return { code: 0, stdout: "192.168.64.8\n", stderr: "" };
          }
          if (command === "ssh") {
            if (args.at(-1) === "true") {
              return { code: 0, stdout: "", stderr: "" };
            }
            throw new Error("stop after tart lifecycle probe");
          }
          return { code: 0, stdout: "", stderr: "" };
        },
        startBackgroundProcess(command, args, options = {}) {
          calls.push({ type: "background", command, args, options });
          return {
            child: { exitCode: null },
            async dispose() {
              calls.push({ type: "dispose-background" });
            },
          };
        },
        async resolveHostIp() {
          return "192.168.64.2";
        },
        async startFeedMirror() {
          return {
            manifestUrl: "http://192.168.64.2:4173/surfaceops-desktop-release-manifest.json",
            async restage() {},
            async dispose() {},
          };
        },
        async startPreviewServer() {
          return { async dispose() {} };
        },
        async startMockRuntime() {
          return {
            baseUrl: "http://192.168.64.2:4311",
            artifacts: {
              starter: { filename: "starter.gguf", sha256: "a", sizeBytes: 1 },
              balanced: { filename: "balanced.gguf", sha256: "b", sizeBytes: 1 },
              quality: { filename: "quality.gguf", sha256: "c", sizeBytes: 1 },
            },
            async dispose() {},
          };
        },
      }),
      /stop after tart lifecycle probe/,
    );

    assert.deepEqual(
      calls
        .filter((entry) => entry.type === "run" && entry.command === "tart")
        .map((entry) => entry.args),
      [
        ["clone", "surfaceops-stage-a-base", "surfaceops-stage-a-20260320T173000Z"],
        ["ip", "surfaceops-stage-a-20260320T173000Z", "--wait", "5"],
        ["stop", "surfaceops-stage-a-20260320T173000Z"],
        ["delete", "surfaceops-stage-a-20260320T173000Z"],
      ],
    );
    assert.deepEqual(
      calls
        .filter((entry) => entry.type === "background" && entry.command === "tart")
        .map((entry) => entry.args),
      [["run", "--no-graphics", "surfaceops-stage-a-20260320T173000Z"]],
    );
  } finally {
    await fsp.rm(repoRoot, { recursive: true, force: true });
  }
});
