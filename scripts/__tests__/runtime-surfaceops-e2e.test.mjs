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
const nodeBinary = process.execPath;
const referenceTargetAppDir = path.join(repoRoot, "apps", "reference-target-web");
const referenceFlowAppDir = path.join(repoRoot, "apps", "reference-flow-web");
const benchmarkAsyncAppDir = path.join(repoRoot, "apps", "benchmark-async-data-web");
const surfaceopsAppDir = path.join(repoRoot, "apps", "surfaceops-web");
const contractsDir = path.join(repoRoot, "contracts");
const workspaceId = "runtime-e2e";
const referenceTargetContractPath = path.join(
  repoRoot,
  "contracts",
  "generated",
  "reference-target-web.contract.json",
);
const referenceFlowContractPath = path.join(
  repoRoot,
  "contracts",
  "generated",
  "reference-flow-web.contract.json",
);
const benchmarkAsyncContractPath = path.join(
  repoRoot,
  "contracts",
  "generated",
  "benchmark-async-data-web.contract.json",
);

let chromiumAvailability;

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

async function ensureChromiumAvailable(t) {
  if (chromiumAvailability === undefined) {
    chromiumAvailability = await new Promise((resolve) => {
      const child = spawn(
        nodeBinary,
        [
          "-e",
          "import('playwright').then(async ({ chromium }) => { const browser = await chromium.launch({ headless: true }); await browser.close(); }).then(() => process.exit(0)).catch(() => process.exit(1));",
        ],
        {
          cwd: path.resolve(
            repoRoot,
            "..",
            "..",
            "..",
            "interfacectl",
            ".worktrees",
            "fitts-law-target-acquisition",
            "packages",
            "interfacectl-cli",
          ),
          env: process.env,
        },
      );
      child.on("exit", (code) => resolve(code === 0));
    });
  }

  if (!chromiumAvailability) {
    t.skip("Playwright Chromium is not installed.");
  }
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
      ?? path.resolve(
        repoRoot,
        "..",
        "..",
        "..",
        "interfacectl",
        ".worktrees",
        "fitts-law-target-acquisition",
      ),
  };
}

function emitRunArtifact({
  workspaceRoot,
  surfaceId,
  status,
  findingCodes = "",
  createdAt,
  runId,
  reportPath,
  contractPath,
}) {
  const args = [
    "scripts/interfacectl-tool.mjs",
    "run",
    "cli",
    "emit-run-artifact",
    "--workspace-root",
    workspaceRoot,
    "--surface",
    surfaceId,
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
  ];
  if (reportPath) {
    args.push("--report-path", reportPath);
  }
  if (contractPath) {
    args.push("--contract", contractPath);
  }
  runOrThrow(
    nodeBinary,
    args,
    {
      cwd: repoRoot,
      env: resolveCliEnv(),
    },
  );
}

function summarizeRuntimeStatus(validatePayload) {
  const errors = Number(validatePayload?.summary?.errors ?? 0);
  const warnings = Number(validatePayload?.summary?.warnings ?? 0);
  if (errors > 0) {
    return "fail";
  }
  if (warnings > 0) {
    return "warn";
  }
  return "pass";
}

function normalizeFindingCodes(validatePayload) {
  return Array.isArray(validatePayload?.findings)
    ? validatePayload.findings
        .map((entry) => String(entry?.code ?? "").trim())
        .filter(Boolean)
    : [];
}

function normalizeUniqueFindingCodes(validatePayload) {
  return [...new Set(normalizeFindingCodes(validatePayload))];
}

function validateRemotePage({
  workspaceRoot,
  surfaceId,
  contractPath,
  remoteUrl,
  reportPath,
}) {
  const result = spawnSync(
    nodeBinary,
    [
      "scripts/interfacectl-tool.mjs",
      "run",
      "cli",
      "validate",
      "--workspace-root",
      repoRoot,
      "--contract",
      contractPath,
      "--surface",
      surfaceId,
      "--remote-url",
      remoteUrl,
      "--format",
      "json",
      "--exit-codes",
      "v2",
      "--out",
      reportPath,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        ...resolveCliEnv(),
        INTERFACECTL_PLAYWRIGHT_HEADLESS: "1",
      },
    },
  );
  assert.ok(
    result.status === 0 || result.status === 30,
    result.stderr || result.stdout,
  );
  return fsp.readFile(reportPath, "utf8").then((raw) => JSON.parse(raw));
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

function countMatches(body, pattern) {
  return [...body.matchAll(pattern)].length;
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
      surfaceId: "reference-target-web",
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
      surfaceId: "reference-target-web",
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

test("runtime e2e: browser-observed target acquisition warnings flow into SurfaceOps runtime runs", { timeout: 180_000 }, async (t) => {
  await ensureChromiumAvailable(t);

  const referenceTargetPort = await getFreePort();
  const surfaceopsPort = await getFreePort();
  const surfaceopsDistDir = ".next-runtime-e2e";
  const workspaceRoot = await createTempWorkspaceRoot();
  const passingReportPath = path.join(workspaceRoot, "target-acquisition.pass.report.json");
  const warningCases = [
    {
      slug: "unobservable",
      query: "?simulateUnobservableTargets=1",
      expectedCode: "target.unobservable",
      createdAt: "2026-03-22T18:08:00.000Z",
      runId: "runtime-target-acquisition-unobservable-warn",
    },
    {
      slug: "hit-area",
      query: "?simulateUndersizedActionTarget=1",
      expectedCode: "target.hit-area-too-small",
      createdAt: "2026-03-22T18:10:00.000Z",
      runId: "runtime-target-acquisition-hit-area-warn",
    },
    {
      slug: "gap",
      query: "?simulateTightActionGap=1",
      expectedCode: "target.gap-too-tight",
      createdAt: "2026-03-22T18:12:00.000Z",
      runId: "runtime-target-acquisition-gap-warn",
    },
    {
      slug: "edge-inset",
      query: "?simulateEdgePinnedActionTarget=1",
      expectedCode: "target.edge-inset-too-small",
      createdAt: "2026-03-22T18:14:00.000Z",
      runId: "runtime-target-acquisition-edge-inset-warn",
    },
    {
      slug: "destructive-spacing",
      query: "?simulateCrowdedDestructiveAction=1",
      expectedCode: "target.destructive-too-close",
      createdAt: "2026-03-22T18:16:00.000Z",
      runId: "runtime-target-acquisition-destructive-warn",
    },
  ];

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
        `http://127.0.0.1:${referenceTargetPort}/${warningCases[0].query}`,
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

    for (const warningCase of warningCases) {
      const reportPath = path.join(workspaceRoot, `target-acquisition.${warningCase.slug}.report.json`);
      const warningValidate = await validateRemotePage({
        workspaceRoot,
        surfaceId: "reference-target-web",
        contractPath: referenceTargetContractPath,
        remoteUrl: `http://127.0.0.1:${referenceTargetPort}/${warningCase.query}`,
        reportPath,
      });
      assert.equal(summarizeRuntimeStatus(warningValidate), "warn", JSON.stringify(warningValidate, null, 2));
      assert.deepEqual(
        normalizeUniqueFindingCodes(warningValidate),
        [warningCase.expectedCode],
        JSON.stringify(warningValidate, null, 2),
      );

      emitRunArtifact({
        workspaceRoot,
        surfaceId: "reference-target-web",
        status: "warn",
        findingCodes: warningCase.expectedCode,
        createdAt: warningCase.createdAt,
        runId: warningCase.runId,
        reportPath,
        contractPath: referenceTargetContractPath,
      });
    }

    const passingValidate = await validateRemotePage({
      workspaceRoot,
      surfaceId: "reference-target-web",
      contractPath: referenceTargetContractPath,
      remoteUrl: `http://127.0.0.1:${referenceTargetPort}/`,
      reportPath: passingReportPath,
    });
    assert.equal(summarizeRuntimeStatus(passingValidate), "pass", JSON.stringify(passingValidate, null, 2));
    assert.equal(normalizeFindingCodes(passingValidate).length, 0, JSON.stringify(passingValidate, null, 2));

    emitRunArtifact({
      workspaceRoot,
      surfaceId: "reference-target-web",
      status: "pass",
      findingCodes: "",
      createdAt: "2026-03-22T18:20:00.000Z",
      runId: "runtime-target-acquisition-pass",
      reportPath: passingReportPath,
      contractPath: referenceTargetContractPath,
    });

    const passRunsPage = await fetchText(
      `http://127.0.0.1:${surfaceopsPort}/contracts/runs/reference-target-web`,
    );
    assert.equal(passRunsPage.status, 200, passRunsPage.body);
    const passRunsBody = normalizePageBody(passRunsPage.body);
    assert.equal(countMatches(passRunsBody, /runtime\s*·\s*warn/g), warningCases.length, passRunsBody);
    assert.equal(countMatches(passRunsBody, /runtime\s*·\s*pass/g), 1, passRunsBody);
    for (const warningCase of warningCases) {
      assert.match(passRunsBody, new RegExp(warningCase.expectedCode.replaceAll(".", "\\.")));
    }
    assert.match(
      passRunsBody,
      /data-testid="runs-kpi-runtime"[\s\S]*pass rate:\s*1\/6[\s\S]*recurring:\s*target\.destructive-too-close\(1\), target\.edge-inset-too-small\(1\), target\.gap-too-tight\(1\), target\.hit-area-too-small\(1\), target\.unobservable\(1\)/,
    );
  } finally {
    await stopServer(referenceTarget);
    await stopServer(surfaceops);
    await fsp.rm(path.join(surfaceopsAppDir, surfaceopsDistDir), { recursive: true, force: true });
    await fsp.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("runtime e2e: browser-observed flow warnings flow into SurfaceOps runtime runs", { timeout: 180_000 }, async (t) => {
  await ensureChromiumAvailable(t);

  const referenceFlowPort = await getFreePort();
  const surfaceopsPort = await getFreePort();
  const surfaceopsDistDir = ".next-runtime-e2e";
  const workspaceRoot = await createTempWorkspaceRoot();
  const passReportPath = path.join(workspaceRoot, "flow.pass.report.json");
  const warningCases = [
    {
      slug: "missing-review-step",
      query: "?simulateMissingReviewStep=1",
      expectedCode: "flow.steps.required",
      createdAt: "2026-03-22T22:10:00.000Z",
      runId: "runtime-flow-missing-step-warn",
    },
    {
      slug: "missing-confirm-transition",
      query: "?simulateMissingConfirmTransition=1",
      expectedCode: "flow.transition.required",
      createdAt: "2026-03-22T22:12:00.000Z",
      runId: "runtime-flow-missing-transition-warn",
    },
    {
      slug: "terminal-back-edge",
      query: "?simulateTerminalBackEdge=1",
      expectedCode: "flow.terminal.invalid",
      createdAt: "2026-03-22T22:14:00.000Z",
      runId: "runtime-flow-terminal-invalid-warn",
    },
    {
      slug: "unobservable",
      query: "?simulateUnobservableFlow=1",
      expectedCode: "flow.unobservable",
      createdAt: "2026-03-22T22:16:00.000Z",
      runId: "runtime-flow-unobservable-warn",
    },
  ];

  runOrThrow("pnpm", ["--filter", "@surfaces/platform-auth", "build"], { cwd: repoRoot });

  const referenceFlow = startDevServer(referenceFlowAppDir, referenceFlowPort);
  const surfaceops = startDevServer(surfaceopsAppDir, surfaceopsPort, {
    SURFACEOPS_CONTRACTS_DIR: path.join(workspaceRoot, "contracts"),
    SURFACEOPS_TEST_BYPASS_AUTH: "1",
    SURFACEOPS_TEST_WORKSPACE_ID: workspaceId,
    SURFACEOPS_NEXT_DIST_DIR: surfaceopsDistDir,
  });

  try {
    try {
      await waitForServer(
        `http://127.0.0.1:${referenceFlowPort}/${warningCases[0].query}`,
        referenceFlow.isRunning,
      );
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nReference flow logs:\n${referenceFlow.getLogs()}`,
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

    for (const warningCase of warningCases) {
      const reportPath = path.join(workspaceRoot, `flow.${warningCase.slug}.report.json`);
      const warningValidate = await validateRemotePage({
        workspaceRoot,
        surfaceId: "reference-flow-web",
        contractPath: referenceFlowContractPath,
        remoteUrl: `http://127.0.0.1:${referenceFlowPort}/${warningCase.query}`,
        reportPath,
      });
      assert.equal(summarizeRuntimeStatus(warningValidate), "warn", JSON.stringify(warningValidate, null, 2));
      assert.deepEqual(
        normalizeUniqueFindingCodes(warningValidate),
        [warningCase.expectedCode],
        JSON.stringify(warningValidate, null, 2),
      );

      emitRunArtifact({
        workspaceRoot,
        surfaceId: "reference-flow-web",
        status: "warn",
        findingCodes: warningCase.expectedCode,
        createdAt: warningCase.createdAt,
        runId: warningCase.runId,
        reportPath,
        contractPath: referenceFlowContractPath,
      });
    }

    const passingValidate = await validateRemotePage({
      workspaceRoot,
      surfaceId: "reference-flow-web",
      contractPath: referenceFlowContractPath,
      remoteUrl: `http://127.0.0.1:${referenceFlowPort}/`,
      reportPath: passReportPath,
    });
    assert.equal(summarizeRuntimeStatus(passingValidate), "pass", JSON.stringify(passingValidate, null, 2));
    assert.equal(normalizeFindingCodes(passingValidate).length, 0, JSON.stringify(passingValidate, null, 2));

    emitRunArtifact({
      workspaceRoot,
      surfaceId: "reference-flow-web",
      status: "pass",
      findingCodes: "",
      createdAt: "2026-03-22T22:20:00.000Z",
      runId: "runtime-flow-pass",
      reportPath: passReportPath,
      contractPath: referenceFlowContractPath,
    });

    const passRunsPage = await fetchText(
      `http://127.0.0.1:${surfaceopsPort}/contracts/runs/reference-flow-web`,
    );
    assert.equal(passRunsPage.status, 200, passRunsPage.body);
    const passRunsBody = normalizePageBody(passRunsPage.body);
    assert.equal(countMatches(passRunsBody, /runtime\s*·\s*warn/g), warningCases.length, passRunsBody);
    assert.equal(countMatches(passRunsBody, /runtime\s*·\s*pass/g), 1, passRunsBody);
    for (const warningCase of warningCases) {
      assert.match(passRunsBody, new RegExp(warningCase.expectedCode.replaceAll(".", "\\.")));
    }
    assert.match(
      passRunsBody,
      /data-testid="runs-kpi-runtime"[\s\S]*pass rate:\s*1\/5[\s\S]*recurring:\s*flow\.steps\.required\(1\), flow\.terminal\.invalid\(1\), flow\.transition\.required\(1\), flow\.unobservable\(1\)/,
    );
  } finally {
    await stopServer(referenceFlow);
    await stopServer(surfaceops);
    await fsp.rm(path.join(surfaceopsAppDir, surfaceopsDistDir), { recursive: true, force: true });
    await fsp.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("runtime e2e: browser-observed feedback and recovery warnings flow into SurfaceOps runtime runs", { timeout: 180_000 }, async (t) => {
  await ensureChromiumAvailable(t);

  const benchmarkAsyncPort = await getFreePort();
  const surfaceopsPort = await getFreePort();
  const surfaceopsDistDir = ".next-runtime-e2e";
  const workspaceRoot = await createTempWorkspaceRoot();
  const passReportPath = path.join(workspaceRoot, "feedback-recovery.pass.report.json");
  const passCases = [
    { slug: "success", query: "" },
    { slug: "loading", query: "?state=loading" },
    { slug: "empty", query: "?state=empty" },
    { slug: "error", query: "?state=error" },
  ];
  const warningCases = [
    {
      slug: "unobservable",
      query: "?simulateUnobservableFeedback=1",
      expectedCode: "feedback.unobservable",
      createdAt: "2026-03-22T20:10:00.000Z",
      runId: "runtime-feedback-recovery-unobservable-warn",
    },
    {
      slug: "recovery-action",
      query: "?state=error&simulateMissingErrorRetry=1",
      expectedCode: "feedback.recovery-action-missing",
      createdAt: "2026-03-22T20:12:00.000Z",
      runId: "runtime-feedback-recovery-action-warn",
    },
    {
      slug: "pending-action",
      query: "?state=loading&simulatePendingActionEnabled=1",
      expectedCode: "feedback.pending-action-not-blocked",
      createdAt: "2026-03-22T20:14:00.000Z",
      runId: "runtime-feedback-recovery-pending-warn",
    },
    {
      slug: "last-good-content",
      query: "?state=error&simulateMissingLastGoodContent=1",
      expectedCode: "feedback.last-good-content-missing",
      createdAt: "2026-03-22T20:16:00.000Z",
      runId: "runtime-feedback-recovery-preserve-warn",
    },
  ];

  runOrThrow("pnpm", ["--filter", "@surfaces/platform-auth", "build"], { cwd: repoRoot });

  const benchmarkAsync = startDevServer(benchmarkAsyncAppDir, benchmarkAsyncPort);
  const surfaceops = startDevServer(surfaceopsAppDir, surfaceopsPort, {
    SURFACEOPS_CONTRACTS_DIR: path.join(workspaceRoot, "contracts"),
    SURFACEOPS_TEST_BYPASS_AUTH: "1",
    SURFACEOPS_TEST_WORKSPACE_ID: workspaceId,
    SURFACEOPS_NEXT_DIST_DIR: surfaceopsDistDir,
  });

  try {
    try {
      await waitForServer(
        `http://127.0.0.1:${benchmarkAsyncPort}/`,
        benchmarkAsync.isRunning,
      );
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nBenchmark async logs:\n${benchmarkAsync.getLogs()}`,
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

    for (const passCase of passCases) {
      const validatePayload = await validateRemotePage({
        workspaceRoot,
        surfaceId: "benchmark-async-data-web",
        contractPath: benchmarkAsyncContractPath,
        remoteUrl: `http://127.0.0.1:${benchmarkAsyncPort}/${passCase.query}`,
        reportPath:
          passCase.slug === "success"
            ? passReportPath
            : path.join(workspaceRoot, `feedback-recovery.${passCase.slug}.report.json`),
      });
      assert.equal(summarizeRuntimeStatus(validatePayload), "pass", JSON.stringify(validatePayload, null, 2));
      assert.equal(normalizeFindingCodes(validatePayload).length, 0, JSON.stringify(validatePayload, null, 2));
    }

    for (const warningCase of warningCases) {
      const reportPath = path.join(workspaceRoot, `feedback-recovery.${warningCase.slug}.report.json`);
      const warningValidate = await validateRemotePage({
        workspaceRoot,
        surfaceId: "benchmark-async-data-web",
        contractPath: benchmarkAsyncContractPath,
        remoteUrl: `http://127.0.0.1:${benchmarkAsyncPort}/${warningCase.query}`,
        reportPath,
      });
      assert.equal(summarizeRuntimeStatus(warningValidate), "warn", JSON.stringify(warningValidate, null, 2));
      assert.deepEqual(
        normalizeUniqueFindingCodes(warningValidate),
        [warningCase.expectedCode],
        JSON.stringify(warningValidate, null, 2),
      );

      emitRunArtifact({
        workspaceRoot,
        surfaceId: "benchmark-async-data-web",
        status: "warn",
        findingCodes: warningCase.expectedCode,
        createdAt: warningCase.createdAt,
        runId: warningCase.runId,
        reportPath,
        contractPath: benchmarkAsyncContractPath,
      });
    }

    emitRunArtifact({
      workspaceRoot,
      surfaceId: "benchmark-async-data-web",
      status: "pass",
      findingCodes: "",
      createdAt: "2026-03-22T20:18:00.000Z",
      runId: "runtime-feedback-recovery-pass",
      reportPath: passReportPath,
      contractPath: benchmarkAsyncContractPath,
    });

    const runsPage = await fetchText(
      `http://127.0.0.1:${surfaceopsPort}/contracts/runs/benchmark-async-data-web`,
    );
    assert.equal(runsPage.status, 200, runsPage.body);
    const runsBody = normalizePageBody(runsPage.body);
    assert.equal(countMatches(runsBody, /runtime\s*·\s*warn/g), warningCases.length, runsBody);
    assert.equal(countMatches(runsBody, /runtime\s*·\s*pass/g), 1, runsBody);
    assert.match(runsBody, /data-testid="runs-kpi-runtime"[\s\S]*pass rate:\s*1\/5/);
    for (const warningCase of warningCases) {
      assert.match(runsBody, new RegExp(`${warningCase.expectedCode.replaceAll(".", "\\.")}\\(1\\)`));
    }
  } finally {
    await stopServer(benchmarkAsync);
    await stopServer(surfaceops);
    await fsp.rm(path.join(surfaceopsAppDir, surfaceopsDistDir), { recursive: true, force: true });
    await fsp.rm(workspaceRoot, { recursive: true, force: true });
  }
});
