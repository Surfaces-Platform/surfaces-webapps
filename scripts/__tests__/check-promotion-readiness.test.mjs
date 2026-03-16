import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));
const scriptPath = path.join(repoRoot, "scripts", "check-promotion-readiness.mjs");

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "promotion-readiness-"));
  fs.mkdirSync(path.join(dir, "contracts", "generated"), { recursive: true });
  fs.mkdirSync(path.join(dir, "artifacts"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "contracts", "surfaces.web.contract.json"),
    JSON.stringify(
      {
        contractId: "surfaces.web",
        version: "0.1.0",
        surfaces: [{ id: "surfaces-web" }],
      },
      null,
      2
    )
  );
  return dir;
}

function runCheck(dir, args) {
  return spawnSync("node", [scriptPath, "--root", dir, ...args], {
    cwd: dir,
    encoding: "utf8",
  });
}

function readContract(dir) {
  return JSON.parse(
    fs.readFileSync(path.join(dir, "contracts", "surfaces.web.contract.json"), "utf8")
  );
}

function contractSummary(dir) {
  const contract = readContract(dir);
  return {
    id: contract.contractId,
    version: contract.version,
    sha256: createHash("sha256")
      .update(`${JSON.stringify(contract, null, 2)}\n`)
      .digest("hex"),
  };
}

function buildRun(dir, overrides = {}) {
  const runId = overrides.runId ?? "run-1";
  const reportPath = overrides.artifacts?.reportPath ?? path.join(dir, "artifacts", `${runId}.report.json`);
  if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({ runId }, null, 2));
  }
  return {
    runId,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    surfaceId: overrides.surfaceId ?? "surfaces-web",
    source: overrides.source ?? "ci",
    status: overrides.status ?? "pass",
    contract: overrides.contract ?? contractSummary(dir),
    artifacts: {
      extractionPath: overrides.artifacts?.extractionPath ?? null,
      reportPath,
    },
    findingCodes: overrides.findingCodes ?? [],
    summary: overrides.summary ?? { errorCount: 0, warnCount: 0 },
  };
}

function writeRuns(dir, runs) {
  fs.writeFileSync(
    path.join(dir, "contracts", "generated", "contract-runs.json"),
    JSON.stringify({ schemaVersion: 2, runs }, null, 2)
  );
}

function readReport(dir) {
  return JSON.parse(
    fs.readFileSync(path.join(dir, "artifacts", "promotion-readiness.json"), "utf8")
  );
}

test("advisory mode reports not-ready but exits zero", () => {
  const dir = makeSandbox();
  writeRuns(dir, []);

  const result = runCheck(dir, ["--mode", "advisory", "--output", "artifacts/promotion-readiness.json"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = readReport(dir);
  assert.equal(report.mode, "advisory");
  assert.equal(report.summary.readyForPromotion, false);
  assert.equal(report.summary.notReadySurfaces, 1);
});

test("block mode fails when required source is failing", () => {
  const dir = makeSandbox();
  const now = new Date().toISOString();
  writeRuns(dir, [
    buildRun(dir, { runId: "run-ci", createdAt: now, source: "ci", status: "fail" }),
    buildRun(dir, { runId: "run-runtime", createdAt: now, source: "runtime", status: "pass" }),
  ]);

  const result = runCheck(dir, ["--mode", "block", "--output", "artifacts/promotion-readiness.json"]);
  assert.notEqual(result.status, 0);

  const report = readReport(dir);
  assert.equal(report.summary.readyForPromotion, false);
  const ciCheck = report.surfaces[0].checks.find((entry) => entry.source === "ci");
  assert.equal(ciCheck.code, "promotion.latest-run-failed");
});

test("block mode passes with fresh non-failing ci/runtime runs", () => {
  const dir = makeSandbox();
  const now = new Date().toISOString();
  writeRuns(dir, [
    buildRun(dir, { runId: "run-ci", createdAt: now, source: "ci", status: "warn" }),
    buildRun(dir, { runId: "run-runtime", createdAt: now, source: "runtime", status: "pass" }),
  ]);

  const result = runCheck(dir, ["--mode", "block", "--output", "artifacts/promotion-readiness.json"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = readReport(dir);
   assert.equal(report.schemaVersion, 2);
  assert.equal(report.summary.readyForPromotion, true);
  assert.equal(report.summary.readySurfaces, 1);
  const runtimeKpi = report.surfaces[0].sourceKpis.find((entry) => entry.source === "runtime");
  assert.equal(runtimeKpi.totalRuns, 1);
  assert.equal(runtimeKpi.passRate, 1);
});

test("block mode fails when the latest run contract does not match the current contract", () => {
  const dir = makeSandbox();
  writeRuns(dir, [
    buildRun(dir, {
      runId: "run-ci",
      source: "ci",
      contract: {
        ...contractSummary(dir),
        sha256: "mismatch",
      },
    }),
    buildRun(dir, { runId: "run-runtime", source: "runtime" }),
  ]);

  const result = runCheck(dir, ["--mode", "block", "--output", "artifacts/promotion-readiness.json"]);
  assert.notEqual(result.status, 0);

  const report = readReport(dir);
  const ciCheck = report.surfaces[0].checks.find((entry) => entry.source === "ci");
  assert.equal(ciCheck.code, "promotion.contract-mismatch");
});

test("source KPI summary captures pass rate, blocking rate, recurring findings, and time to green", () => {
  const dir = makeSandbox();
  writeRuns(dir, [
    buildRun(dir, {
      runId: "run-1",
      createdAt: "2026-03-16T18:00:00.000Z",
      source: "generation",
      status: "fail",
      findingCodes: ["layout.mismatch", "motion.none-detected"],
      summary: { errorCount: 2, warnCount: 0 },
    }),
    buildRun(dir, {
      runId: "run-2",
      createdAt: "2026-03-16T18:10:00.000Z",
      source: "generation",
      status: "warn",
      findingCodes: ["motion.none-detected"],
      summary: { errorCount: 0, warnCount: 1 },
    }),
    buildRun(dir, {
      runId: "run-3",
      createdAt: "2026-03-16T18:15:00.000Z",
      source: "generation",
      status: "pass",
    }),
  ]);

  const result = runCheck(dir, [
    "--mode",
    "advisory",
    "--required-sources",
    "generation",
    "--output",
    "artifacts/promotion-readiness.json",
  ]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = readReport(dir);
  const generationKpi = report.surfaces[0].sourceKpis[0];
  assert.equal(generationKpi.source, "generation");
  assert.equal(generationKpi.totalRuns, 3);
  assert.equal(generationKpi.passedRuns, 1);
  assert.equal(generationKpi.blockingRuns, 1);
  assert.equal(generationKpi.passRate, 0.3333);
  assert.equal(generationKpi.blockingRate, 0.3333);
  assert.equal(generationKpi.recurringFindingCodes[0].code, "motion.none-detected");
  assert.equal(generationKpi.recurringFindingCodes[0].count, 2);
  assert.equal(generationKpi.timeToGreen.latestMs, 900000);
  assert.equal(generationKpi.timeToGreen.averageMs, 900000);
  assert.equal(generationKpi.latestRun.runId, "run-3");
});
