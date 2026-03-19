import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

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

async function createMockRuntimeServer(rootDir) {
  const modelDir = path.join(rootDir, "models");
  await fsp.mkdir(modelDir, { recursive: true });

  const artifacts = {};
  for (const modelId of ["starter", "balanced", "quality"]) {
    const filename = `${modelId}.gguf`;
    const contents = Buffer.from(`mock-${modelId}-artifact`, "utf8");
    await fsp.writeFile(path.join(modelDir, filename), contents);
    artifacts[modelId] = {
      filename,
      sha256: sha256(contents),
      sizeBytes: contents.length,
    };
  }

  const port = await reservePort();
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

    if (request.method === "GET" && requestUrl.pathname === "/health") {
      response.writeHead(200, {
        "content-type": "application/json",
        connection: "close",
      });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/v1/models") {
      response.writeHead(200, {
        "content-type": "application/json",
        connection: "close",
      });
      response.end(JSON.stringify({
        object: "list",
        data: [
          { id: "starter", object: "model" },
          { id: "balanced", object: "model" },
          { id: "quality", object: "model" },
        ],
      }));
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/responses") {
      response.writeHead(200, {
        "content-type": "application/json",
        connection: "close",
      });
      response.end(JSON.stringify({
        id: "resp_smoke",
        object: "response",
        output_text: "BENCHMARK_READY",
        output: [],
      }));
      return;
    }

    if (request.method === "GET" && requestUrl.pathname.startsWith("/models/")) {
      const filename = requestUrl.pathname.replace("/models/", "");
      const filePath = path.join(modelDir, filename);
      if (!fs.existsSync(filePath)) {
        response.writeHead(404);
        response.end();
        return;
      }
      response.writeHead(200, {
        "content-type": "application/octet-stream",
        "content-length": String((await fsp.stat(filePath)).size),
        connection: "close",
      });
      fs.createReadStream(filePath).pipe(response);
      return;
    }

    response.writeHead(404);
    response.end();
  });

  server.listen(port, "127.0.0.1");
  await once(server, "listening");

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    artifacts,
    server,
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
    const mockRuntime = await createMockRuntimeServer(sandbox);

    try {
      assert.equal(fs.existsSync(bundledRuntimeBinary), true, "Expected bundled llama-server in packaged app resources.");
      await fsp.mkdir(userDataDir, { recursive: true });

      await fsp.writeFile(
        overridesPath,
        JSON.stringify(
          {
            starter: {
              downloadUrl: `${mockRuntime.baseUrl}/models/${mockRuntime.artifacts.starter.filename}`,
              sha256: mockRuntime.artifacts.starter.sha256,
              sizeBytes: mockRuntime.artifacts.starter.sizeBytes,
              filename: mockRuntime.artifacts.starter.filename,
            },
            balanced: {
              downloadUrl: `${mockRuntime.baseUrl}/models/${mockRuntime.artifacts.balanced.filename}`,
              sha256: mockRuntime.artifacts.balanced.sha256,
              sizeBytes: mockRuntime.artifacts.balanced.sizeBytes,
              filename: mockRuntime.artifacts.balanced.filename,
            },
            quality: {
              downloadUrl: `${mockRuntime.baseUrl}/models/${mockRuntime.artifacts.quality.filename}`,
              sha256: mockRuntime.artifacts.quality.sha256,
              sizeBytes: mockRuntime.artifacts.quality.sizeBytes,
              filename: mockRuntime.artifacts.quality.filename,
            },
          },
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
        SURFACEOPS_DESKTOP_TEST_MEMORY_GB: "24",
        SURFACEOPS_DESKTOP_TEST_CHIP: "Apple M2 Pro",
      };

      await fsp.writeFile(
        firstRunConfigPath,
        JSON.stringify({
          expectedInitialPath: "/desktop/setup",
          expectedWorkbenchPath: "/contracts/governance",
          installModelId: "balanced",
          runBenchmark: true,
          replaceModelId: "starter",
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
      assert.equal(firstRun.result.benchmark.modelId, "balanced");

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
      await fsp.rm(sandbox, { recursive: true, force: true });
    }
  },
);
