import { test } from "node:test";
import assert from "node:assert/strict";
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

function writeRuns(dir, runs) {
  fs.writeFileSync(
    path.join(dir, "contracts", "generated", "contract-runs.json"),
    JSON.stringify({ schemaVersion: 1, runs }, null, 2)
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
    {
      runId: "run-ci",
      createdAt: now,
      surfaceId: "surfaces-web",
      source: "ci",
      status: "fail",
    },
    {
      runId: "run-runtime",
      createdAt: now,
      surfaceId: "surfaces-web",
      source: "runtime",
      status: "pass",
    },
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
    {
      runId: "run-ci",
      createdAt: now,
      surfaceId: "surfaces-web",
      source: "ci",
      status: "warn",
    },
    {
      runId: "run-runtime",
      createdAt: now,
      surfaceId: "surfaces-web",
      source: "runtime",
      status: "pass",
    },
  ]);

  const result = runCheck(dir, ["--mode", "block", "--output", "artifacts/promotion-readiness.json"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = readReport(dir);
  assert.equal(report.summary.readyForPromotion, true);
  assert.equal(report.summary.readySurfaces, 1);
});
