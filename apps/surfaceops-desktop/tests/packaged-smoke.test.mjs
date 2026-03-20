import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import {
  buildSurfaceOpsModelDownloadOverrides,
  createSurfaceOpsMockRuntimeServer,
} from "../test-support/mock-runtime-server.mjs";

async function reservePort() {
  const server = http.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not reserve a port.");
  }
  const { port } = address;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  return port;
}

function resolvePackagedExecutable(appRoot) {
  const candidates = [
    path.join(appRoot, "dist", "mac-arm64", "SurfaceOps.app", "Contents", "MacOS", "SurfaceOps"),
    path.join(appRoot, "dist", "mac", "SurfaceOps.app", "Contents", "MacOS", "SurfaceOps"),
  ];
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executablePath) {
    throw new Error(
      "Could not find a packaged SurfaceOps app. Build it first with `pnpm --filter surfaceops-desktop dist:mac` or use `pnpm --filter surfaceops-desktop smoke:packaged:build`.",
    );
  }
  return executablePath;
}

async function createMockUpdateServer(rootDir) {
  const port = await reservePort();
  let updatePayload = { available: false };

  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
    if (request.method === "GET" && requestUrl.pathname === "/mock-update.json") {
      response.writeHead(200, {
        "content-type": "application/json",
        connection: "close",
      });
      response.end(JSON.stringify(updatePayload));
      return;
    }

    response.writeHead(404);
    response.end();
  });

  server.listen(port, "127.0.0.1");
  await once(server, "listening");

  const quitAndInstallSignalPath = path.join(rootDir, "update-restart-request.json");
  return {
    quitAndInstallSignalPath,
    server,
    setUpdatePayload(payload) {
      updatePayload = { ...payload };
    },
    statusUrl: `http://127.0.0.1:${port}/mock-update.json`,
  };
}

async function waitForFile(filePath, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for smoke result at ${filePath}.`);
}

async function runPackagedSmokeScenario({ executablePath, env, configPath, resultPath, timeoutMs }) {
  const child = spawn(executablePath, {
    env: {
      ...env,
      SURFACEOPS_DESKTOP_SMOKE_CONFIG_PATH: configPath,
      SURFACEOPS_DESKTOP_SMOKE_RESULT_PATH: resultPath,
    },
    stdio: "pipe",
  });
  const exitPromise = new Promise((resolve, reject) => {
    child.once("error", reject);
    if (child.exitCode !== null) {
      resolve(child.exitCode);
      return;
    }
    child.once("exit", (code) => resolve(code ?? 0));
  });

  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  try {
    await waitForFile(resultPath, timeoutMs);
  } catch (error) {
    child.kill("SIGTERM");
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
  }

  const result = JSON.parse(await fsp.readFile(resultPath, "utf8"));
  const exitCode = await exitPromise;

  return {
    result,
    exitCode,
    stdout,
    stderr,
  };
}

test(
  "packaged SurfaceOps desktop completes the managed-model first-run smoke flow",
  { skip: process.env.SURFACEOPS_RUN_PACKAGED_SMOKE !== "1" || process.platform !== "darwin" || process.arch !== "arm64" },
  async () => {
    const appRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
    const executablePath = resolvePackagedExecutable(appRoot);
    const resourcesRoot = path.resolve(path.dirname(executablePath), "..", "Resources");
    const bundledRuntimeBinary = path.join(resourcesRoot, "model-runtime", "llama-server");
    const sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-packaged-smoke-"));
    const userDataDir = path.join(sandbox, "user-data");
    const overridesPath = path.join(sandbox, "model-download-overrides.json");
    const firstRunConfigPath = path.join(sandbox, "first-run-config.json");
    const firstRunResultPath = path.join(sandbox, "first-run-result.json");
    const secondRunConfigPath = path.join(sandbox, "second-run-config.json");
    const secondRunResultPath = path.join(sandbox, "second-run-result.json");
      const updateRunConfigPath = path.join(sandbox, "update-run-config.json");
      const updateRunResultPath = path.join(sandbox, "update-run-result.json");
      const postUpdateConfigPath = path.join(sandbox, "post-update-config.json");
      const postUpdateResultPath = path.join(sandbox, "post-update-result.json");
    const mockRuntime = await createSurfaceOpsMockRuntimeServer({ rootDir: sandbox });
    const mockUpdates = await createMockUpdateServer(sandbox);

    try {
      assert.equal(fs.existsSync(bundledRuntimeBinary), true, "Expected bundled llama-server in packaged app resources.");
      await fsp.mkdir(userDataDir, { recursive: true });

      await fsp.writeFile(
        overridesPath,
        JSON.stringify(
          buildSurfaceOpsModelDownloadOverrides({
            baseUrl: mockRuntime.baseUrl,
            artifacts: mockRuntime.artifacts,
          }),
          null,
          2,
        ),
        "utf8",
      );

      const appPort = await reservePort();
      const modeldPort = await reservePort();
      const backendPort = await reservePort();
      const baseEnv = {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        SURFACEOPS_DESKTOP_PORT: String(appPort),
        SURFACEOPS_DESKTOP_MODELD_PORT: String(modeldPort),
        SURFACEOPS_DESKTOP_MODEL_BACKEND_PORT: String(backendPort),
        SURFACEOPS_UPDATE_BASE_URL: `${mockRuntime.baseUrl}/updates`,
        SURFACEOPS_DESKTOP_USER_DATA_DIR: userDataDir,
        SURFACEOPS_DESKTOP_MODEL_DOWNLOAD_OVERRIDES_PATH: overridesPath,
        SURFACEOPS_MODEL_BACKEND_TARGET_URL: mockRuntime.baseUrl,
        SURFACEOPS_DESKTOP_TEST_PLATFORM: "darwin-arm64",
        SURFACEOPS_DESKTOP_TEST_MEMORY_GB: "16",
        SURFACEOPS_DESKTOP_TEST_CHIP: "Apple M2 Pro",
        SURFACEOPS_DESKTOP_TEST_UPDATE_MOCK_URL: mockUpdates.statusUrl,
      };

      await fsp.writeFile(
        firstRunConfigPath,
        JSON.stringify({
          expectedInitialPath: "/desktop/setup",
          expectedWorkbenchPath: "/contracts/governance",
          installModelId: "starter",
          runBenchmark: true,
          expectedFinalPath: "/contracts/governance",
          exitWhenDone: true,
          timeoutMs: 120_000,
        }, null, 2),
        "utf8",
      );

      const firstRun = await runPackagedSmokeScenario({
        executablePath,
        env: baseEnv,
        configPath: firstRunConfigPath,
        resultPath: firstRunResultPath,
        timeoutMs: 150_000,
      });

      assert.equal(firstRun.exitCode, 0, `Expected first packaged smoke run to exit cleanly.\nSTDOUT:\n${firstRun.stdout}\nSTDERR:\n${firstRun.stderr}`);
      assert.equal(firstRun.result.ok, true, firstRun.result.errorMessage ?? "Expected first packaged smoke run to succeed.");
      assert.match(firstRun.result.initialUrl, /\/desktop\/setup$/);
      assert.match(firstRun.result.finalUrl, /\/contracts\/governance$/);
      assert.equal(firstRun.result.finalState.activeModelId, "starter");
      assert.equal(firstRun.result.finalState.runtimeStatus.phase, "ready");
      assert.equal(firstRun.result.finalState.runtimeStatus.healthy, true);
      assert.equal(firstRun.result.benchmark.modelId, "starter");

      await fsp.writeFile(
        secondRunConfigPath,
        JSON.stringify({
          expectedInitialPath: "/contracts/governance",
          exitWhenDone: true,
          timeoutMs: 120_000,
        }, null, 2),
        "utf8",
      );

      const secondRun = await runPackagedSmokeScenario({
        executablePath,
        env: baseEnv,
        configPath: secondRunConfigPath,
        resultPath: secondRunResultPath,
        timeoutMs: 150_000,
      });

      assert.equal(secondRun.exitCode, 0, `Expected relaunch smoke run to exit cleanly.\nSTDOUT:\n${secondRun.stdout}\nSTDERR:\n${secondRun.stderr}`);
      assert.equal(secondRun.result.ok, true, secondRun.result.errorMessage ?? "Expected relaunch smoke run to succeed.");
      assert.match(secondRun.result.initialUrl, /\/contracts\/governance$/);
      assert.equal(secondRun.result.finalState.activeModelId, "starter");

      mockUpdates.setUpdatePayload({
        available: true,
        version: "0.1.1",
        releaseDate: "2026-03-20T00:00:00.000Z",
        releaseNotes: "SurfaceOps updater smoke release",
        progressPercents: [18, 67, 100],
        quitAndInstallSignalPath: mockUpdates.quitAndInstallSignalPath,
      });

      await fsp.writeFile(
        updateRunConfigPath,
        JSON.stringify({
          expectedInitialPath: "/contracts/governance",
          checkForUpdates: true,
          waitForDownloadedVersion: "0.1.1",
          restartToUpdate: true,
          resultLabel: "update-run",
          exitWhenDone: true,
          timeoutMs: 120_000,
        }, null, 2),
        "utf8",
      );

      const updateRun = await runPackagedSmokeScenario({
        executablePath,
        env: baseEnv,
        configPath: updateRunConfigPath,
        resultPath: updateRunResultPath,
        timeoutMs: 150_000,
      });

      assert.equal(updateRun.exitCode, 0, `Expected update smoke run to exit cleanly.\nSTDOUT:\n${updateRun.stdout}\nSTDERR:\n${updateRun.stderr}`);
      assert.equal(updateRun.result.ok, true, updateRun.result.errorMessage ?? "Expected update smoke run to succeed.");
      assert.equal(updateRun.result.resultLabel, "update-run");
      assert.equal(updateRun.result.updateRestartRequested, true);
      assert.equal(updateRun.result.updateStatus?.downloadedVersion, "0.1.1");
      assert.equal(fs.existsSync(mockUpdates.quitAndInstallSignalPath), true, "Expected restart-to-update to trigger the smoke updater install marker.");

      mockUpdates.setUpdatePayload({ available: false });

      await fsp.writeFile(
        postUpdateConfigPath,
        JSON.stringify({
          expectedInitialPath: "/contracts/governance",
          expectedVersionAfterRestart: "0.1.1",
          resultLabel: "post-update",
          exitWhenDone: true,
          timeoutMs: 120_000,
        }, null, 2),
        "utf8",
      );

      const postUpdateRun = await runPackagedSmokeScenario({
        executablePath,
        env: {
          ...baseEnv,
          SURFACEOPS_DESKTOP_TEST_APP_VERSION: "0.1.1",
        },
        configPath: postUpdateConfigPath,
        resultPath: postUpdateResultPath,
        timeoutMs: 150_000,
      });

      assert.equal(postUpdateRun.exitCode, 0, `Expected post-update verification run to exit cleanly.\nSTDOUT:\n${postUpdateRun.stdout}\nSTDERR:\n${postUpdateRun.stderr}`);
      assert.equal(postUpdateRun.result.ok, true, postUpdateRun.result.errorMessage ?? "Expected post-update verification to succeed.");
      assert.equal(postUpdateRun.result.resultLabel, "post-update");
      assert.equal(postUpdateRun.result.currentVersion, "0.1.1");
    } finally {
      mockRuntime.server.closeIdleConnections?.();
      mockRuntime.server.closeAllConnections?.();
      await new Promise((resolve, reject) => {
        mockRuntime.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      await new Promise((resolve, reject) => {
        mockUpdates.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      await fsp.rm(sandbox, { recursive: true, force: true });
    }
  },
);
