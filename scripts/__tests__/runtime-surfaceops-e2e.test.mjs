import { test } from "node:test";
import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".."),
);
const referenceTargetAppDir = path.join(repoRoot, "apps", "reference-target-web");
const surfaceopsAppDir = path.join(repoRoot, "apps", "surfaceops-web");
const contractsDir = path.join(repoRoot, "contracts");
const workspaceId = "runtime-e2e";

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate free port.")));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on("error", reject);
  });
}

function runOrThrow(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

async function waitForServer(url, isProcessRunning, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessRunning()) {
      throw new Error(`Server process exited before becoming ready: ${url}`);
    }
    try {
      const response = await fetch(url);
      if (response.status < 500) {
        return;
      }
    } catch {
      // server not ready yet
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for server: ${url}`);
}

function startDevServer(appDir, port, env = {}) {
  const child = spawn("pnpm", ["exec", "next", "dev", "--port", String(port), "--webpack"], {
    cwd: appDir,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      ...env,
    },
    stdio: "pipe",
  });

  let logs = "";
  child.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });

  let exited = false;
  child.on("exit", () => {
    exited = true;
  });

  return {
    child,
    isRunning: () => !exited,
    getLogs: () => logs,
  };
}

async function stopServer(server) {
  server.child.kill("SIGTERM");
  await wait(500);
  if (server.isRunning()) {
    server.child.kill("SIGKILL");
    await wait(500);
  }
}

async function createTempWorkspaceRoot() {
  const workspaceRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-runtime-e2e-"));
  const tempContractsDir = path.join(workspaceRoot, "contracts");
  await fsp.cp(contractsDir, tempContractsDir, { recursive: true });

  for (const fileName of ["contract-runs.json", "contract-lineage.json", "validation-outcomes.json"]) {
    await fsp.rm(path.join(tempContractsDir, "generated", fileName), { force: true });
  }

  return workspaceRoot;
}

function resolveCliEnv() {
  return {
    SURFACES_INTERFACECTL_ROOT:
      process.env.SURFACES_INTERFACECTL_ROOT
      ?? path.resolve(repoRoot, "..", "..", "..", ".worktrees", "interfacectl-main"),
  };
}

function emitRunArtifact({
  workspaceRoot,
  status,
  findingCodes = "",
  createdAt,
  runId,
}) {
  runOrThrow(
    "node",
    [
      "scripts/interfacectl-tool.mjs",
      "run",
      "cli",
      "emit-run-artifact",
      "--workspace-root",
      workspaceRoot,
      "--surface",
      "reference-target-web",
      "--source",
      "runtime",
      "--status",
      status,
      "--finding-codes",
      findingCodes,
      "--workspace-id",
      workspaceId,
      "--created-at",
      createdAt,
      "--run-id",
      runId,
    ],
    {
      cwd: repoRoot,
      env: resolveCliEnv(),
    },
  );
}

async function fetchText(url) {
  const response = await fetch(url);
  const body = await response.text();
  return {
    status: response.status,
    body,
  };
}

function normalizePageBody(body) {
  return body.replace(/<!-- -->/g, " ").replace(/\s+/g, " ");
}

test("runtime e2e: reference target adaptive gate is reflected in SurfaceOps runtime runs", { timeout: 180_000 }, async () => {
  const referenceTargetPort = await getFreePort();
  const surfaceopsPort = await getFreePort();
  const surfaceopsDistDir = ".next-runtime-e2e";
  const workspaceRoot = await createTempWorkspaceRoot();

  runOrThrow("pnpm", ["--filter", "@surfaces/platform-auth", "build"], { cwd: repoRoot });

  const referenceTarget = startDevServer(referenceTargetAppDir, referenceTargetPort);
  const surfaceops = startDevServer(surfaceopsAppDir, surfaceopsPort, {
    SURFACEOPS_CONTRACTS_DIR: path.join(workspaceRoot, "contracts"),
    SURFACEOPS_TEST_BYPASS_AUTH: "1",
    SURFACEOPS_TEST_WORKSPACE_ID: workspaceId,
    SURFACEOPS_NEXT_DIST_DIR: surfaceopsDistDir,
  });

  try {
    try {
      await waitForServer(
        `http://127.0.0.1:${referenceTargetPort}/adaptive/test?section=landing.hero`,
        referenceTarget.isRunning,
      );
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nReference target logs:\n${referenceTarget.getLogs()}`,
      );
    }

    try {
      await waitForServer(
        `http://127.0.0.1:${surfaceopsPort}/contracts/runs`,
        surfaceops.isRunning,
      );
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nSurfaceOps logs:\n${surfaceops.getLogs()}`,
      );
    }

    const failingProbe = await fetchText(`http://127.0.0.1:${referenceTargetPort}/adaptive/test`);
    assert.equal(failingProbe.status, 422, failingProbe.body);
    assert.match(failingProbe.body, /sections\.required/);

    emitRunArtifact({
      workspaceRoot,
      status: "fail",
      findingCodes: "sections.required",
      createdAt: "2026-03-19T01:00:00.000Z",
      runId: "runtime-e2e-fail",
    });

    const failRunsPage = await fetchText(
      `http://127.0.0.1:${surfaceopsPort}/contracts/runs/reference-target-web`,
    );
    assert.equal(failRunsPage.status, 200, failRunsPage.body);
    const failRunsBody = normalizePageBody(failRunsPage.body);
    assert.match(failRunsBody, /data-testid="runs-kpi-runtime"/);
    assert.match(failRunsBody, /pass rate:\s*insufficient history/);
    assert.match(failRunsBody, /runtime\s*·\s*fail/);
    assert.match(failRunsBody, /sections\.required/);

    const passingProbe = await fetchText(
      `http://127.0.0.1:${referenceTargetPort}/adaptive/test?section=landing.hero`,
    );
    assert.equal(passingProbe.status, 200, passingProbe.body);
    assert.match(passingProbe.body, /Reference Target Adaptive Test/);

    emitRunArtifact({
      workspaceRoot,
      status: "pass",
      createdAt: "2026-03-19T01:05:00.000Z",
      runId: "runtime-e2e-pass",
    });

    const passRunsPage = await fetchText(
      `http://127.0.0.1:${surfaceopsPort}/contracts/runs/reference-target-web`,
    );
    assert.equal(passRunsPage.status, 200, passRunsPage.body);
    const passRunsBody = normalizePageBody(passRunsPage.body);
    assert.match(
      passRunsBody,
      /data-testid="runs-kpi-runtime"[\s\S]*pass rate:\s*1\/2[\s\S]*recurring:\s*sections\.required\(1\)[\s\S]*time-to-green:\s*&lt;1h/,
    );
    assert.match(passRunsBody, /runtime\s*·\s*pass/);
    assert.match(passRunsBody, /runtime\s*·\s*fail/);
  } finally {
    await stopServer(referenceTarget);
    await stopServer(surfaceops);
    await fsp.rm(path.join(surfaceopsAppDir, surfaceopsDistDir), { recursive: true, force: true });
    await fsp.rm(workspaceRoot, { recursive: true, force: true });
  }
});
