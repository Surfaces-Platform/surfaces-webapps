import { test } from "node:test";
import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const workspaceRoot = path.resolve(appDir, "../..");

function stringifyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeJson(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, stringifyJson(value), "utf8");
}

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

async function waitForServer(url, isProcessRunning, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessRunning()) {
      throw new Error(`Server process exited before becoming ready: ${url}`);
    }
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // server not ready yet
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for server: ${url}`);
}

function runOrThrow(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: options.cwd ?? appDir,
    encoding: "utf8",
    env: { ...process.env, ...(options.env ?? {}) },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

async function seedComparison(runDir, status, findings) {
  const attemptsDir = path.join(runDir, "attempts");
  await fsp.mkdir(attemptsDir, { recursive: true });
  await writeJson(path.join(attemptsDir, "001.validate.json"), {
    status,
    findings,
  });
}

async function seedLocalWorkbenchFixture(runRoot) {
  const surfaceRoot = path.join(runRoot, "reference-target-web");
  const runsRoot = path.join(surfaceRoot, "runs");
  await fsp.mkdir(runsRoot, { recursive: true });

  await writeJson(path.join(surfaceRoot, "contract-session.json"), {
    schemaVersion: 2,
    surfaceId: "reference-target-web",
    canonicalContractPath: path.join(workspaceRoot, "contracts", "generated", "reference-target-web.contract.json"),
    updatedAt: "2026-03-14T16:19:27.000Z",
    workingContract: {
      contractId: "reference-target-web.generated",
      version: "0.1.0",
      description: "Generated fixture contract.",
      sections: [{ id: "landing.hero" }, { id: "landing.capabilities" }],
      color: {
        policy: "warn",
        allowedValues: ["#f9fbff"],
      },
      surfaces: [
        {
          id: "reference-target-web",
          allowedFonts: ["Inter", "sans-serif"],
          layout: { maxContentWidth: 1160 },
          requiredSections: ["landing.hero", "landing.capabilities"],
        },
      ],
    },
    chat: [],
    activeContractChanges: [],
    activeDesignerNotes: [],
  });

  const latestRunDir = path.join(runsRoot, "20260314091904");
  const latestBaselineDir = path.join(latestRunDir, "baseline");
  const latestCurrentDir = path.join(latestRunDir, "current");
  await seedComparison(latestBaselineDir, "warn", [
    { code: "motion.none-detected", message: "No motion declarations detected.", severity: "warn" },
    { code: "token.normalization-skipped", message: "Token normalization skipped.", severity: "warn" },
  ]);
  await seedComparison(latestCurrentDir, "pass", []);

  const runs = [
    {
      runId: "20260314091904",
      status: "succeeded",
      createdAt: "2026-03-14T16:19:04.000Z",
      completedAt: "2026-03-14T16:19:27.000Z",
      touchedFiles: ["apps/reference-target-web/app/globals.css"],
      errorMessage: null,
      baselineSessionDir: latestBaselineDir,
      currentSessionDir: latestCurrentDir,
    },
    {
      runId: "20260313091715",
      status: "failed",
      createdAt: "2026-03-13T16:17:15.000Z",
      completedAt: "2026-03-13T16:17:40.000Z",
      touchedFiles: [],
      errorMessage: "Local model request failed with 500.",
      baselineSessionDir: null,
      currentSessionDir: null,
    },
    {
      runId: "20260312091636",
      status: "succeeded",
      createdAt: "2026-03-12T16:16:36.000Z",
      completedAt: "2026-03-12T16:16:59.000Z",
      touchedFiles: ["apps/reference-target-web/app/page.tsx"],
      errorMessage: null,
      baselineSessionDir: null,
      currentSessionDir: null,
    },
    {
      runId: "20260311091520",
      status: "failed",
      createdAt: "2026-03-11T16:15:20.000Z",
      completedAt: "2026-03-11T16:15:50.000Z",
      touchedFiles: [],
      errorMessage: "reference-target-web dev server returned HTTP 500.",
      baselineSessionDir: null,
      currentSessionDir: null,
    },
  ];

  await Promise.all(runs.map(async (run) => {
    const runDir = path.join(runsRoot, run.runId);
    await writeJson(path.join(runDir, "run.json"), {
      schemaVersion: 1,
      runId: run.runId,
      status: run.status,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
      contractPath: path.join(workspaceRoot, "contracts", "generated", "reference-target-web.contract.json"),
      preparedInputPath: null,
      baselineSessionDir: run.baselineSessionDir,
      currentSessionDir: run.currentSessionDir,
      baselinePreviewPath: null,
      currentPreviewPath: null,
      baselineSummaryPath: null,
      currentSummaryPath: null,
      comparisonPath: null,
      suggestionsPath: null,
      transcriptPath: null,
      effectiveContractPath: null,
      agentInputPath: null,
      explainabilityPath: null,
      touchedFiles: run.touchedFiles,
      errorMessage: run.errorMessage,
    });
  }));
}

test("browser smoke: local workbench controls stay decision-focused", { timeout: 120_000 }, async (t) => {
  let chromium;
  try {
    ({ chromium } = await import("@playwright/test"));
  } catch {
    t.skip("Playwright is not installed.");
    return;
  }

  const runRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-local-workbench-browser-"));
  const port = await getFreePort();
  const distDir = `.next-browser-smoke-${port}`;

  await seedLocalWorkbenchFixture(runRoot);
  runOrThrow("pnpm", ["--filter", "@surfaces/platform-auth", "build"], { cwd: workspaceRoot });

  const dev = spawn("pnpm", ["exec", "next", "dev", "--port", String(port), "--webpack"], {
    cwd: appDir,
    env: {
      ...process.env,
      SURFACEOPS_LOCAL_WORKBENCH: "1",
      SURFACEOPS_LOCAL_RUNS_DIR: runRoot,
      SURFACEOPS_NEXT_DIST_DIR: distDir,
      SURFACEOPS_TEST_BYPASS_AUTH: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: "pipe",
  });

  let serverLogs = "";
  dev.stdout.on("data", (chunk) => {
    serverLogs += chunk.toString();
  });
  dev.stderr.on("data", (chunk) => {
    serverLogs += chunk.toString();
  });
  let exited = false;
  dev.on("exit", () => {
    exited = true;
  });

  try {
    try {
      await waitForServer(`http://127.0.0.1:${port}/contracts/governance`, () => !exited);
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}\nServer logs:\n${serverLogs}`);
    }

    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      t.skip(`Chromium not available for Playwright: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
      await page.goto(`http://127.0.0.1:${port}/contracts/governance`, { waitUntil: "networkidle" });

      await page.getByText("Latest result", { exact: true }).waitFor({ timeout: 20_000 });
      await page.getByText("Next action", { exact: true }).waitFor({ timeout: 20_000 });
      await page.getByText("Evidence summary", { exact: true }).waitFor({ timeout: 20_000 });
      await page.getByText("Use the trace tab to inspect the full local run history without leaving the workbench.").waitFor({ timeout: 20_000 });

      assert.equal(await page.getByText("Guidance", { exact: true }).count(), 0, "Empty guidance should stay hidden.");
      assert.equal(await page.locator('[data-testid="local-workbench-recent-run"]').count(), 3, "Recent runs should be capped at three cards.");
      assert.equal(
        await page.locator('[data-testid="local-workbench-technical-context"]').evaluate((element) => element.hasAttribute("open")),
        false,
        "Technical context should stay collapsed by default.",
      );
      assert.equal(await page.getByText("Contract summary", { exact: true }).isVisible(), false);
    } finally {
      await browser.close();
    }
  } finally {
    dev.kill("SIGTERM");
    await wait(500);
    await fsp.rm(path.join(appDir, distDir), { recursive: true, force: true });
    await fsp.rm(runRoot, { recursive: true, force: true });
  }
});
