import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contract-runs-writer-"));
  fs.mkdirSync(path.join(dir, "contracts", "generated"), { recursive: true });
  fs.mkdirSync(path.join(dir, "scripts", "lib"), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, "scripts", "lib", "contract-runs.mjs"),
    path.join(dir, "scripts", "lib", "contract-runs.mjs")
  );
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
  return {
    dir,
    scriptPath: path.join(dir, "scripts", "lib", "contract-runs.mjs"),
    runsPath: path.join(dir, "contracts", "generated", "contract-runs.json"),
    lineagePath: path.join(dir, "contracts", "generated", "contract-lineage.json"),
  };
}

function runSync(sandbox, args) {
  const result = spawnSync("node", [sandbox.scriptPath, ...args], {
    cwd: sandbox.dir,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function runAsync(sandbox, args) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [sandbox.scriptPath, ...args], {
      cwd: sandbox.dir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `exit=${code}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function readRuns(sandbox) {
  const doc = JSON.parse(fs.readFileSync(sandbox.runsPath, "utf8"));
  return Array.isArray(doc.runs) ? doc.runs : [];
}

function readLineage(sandbox) {
  const doc = JSON.parse(fs.readFileSync(sandbox.lineagePath, "utf8"));
  return doc.surfaces ?? {};
}

test("writer dedupes duplicate runId", () => {
  const sandbox = makeSandbox();
  runSync(sandbox, ["init", "--root", sandbox.dir]);

  runSync(sandbox, [
    "emit",
    "--root",
    sandbox.dir,
    "--surface-id",
    "surfaces-web",
    "--source",
    "ci",
    "--status",
    "pass",
    "--run-id",
    "run-1",
    "--created-at",
    "2026-02-19T00:00:00.000Z",
  ]);

  runSync(sandbox, [
    "emit",
    "--root",
    sandbox.dir,
    "--surface-id",
    "surfaces-web",
    "--source",
    "ci",
    "--status",
    "fail",
    "--run-id",
    "run-1",
    "--created-at",
    "2026-02-19T01:00:00.000Z",
  ]);

  const runs = readRuns(sandbox);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].runId, "run-1");
  const lineage = readLineage(sandbox);
  assert.equal(lineage["surfaces-web"].lastRunId, "run-1");
});

test("writer dedupes duplicate idempotency keys", () => {
  const sandbox = makeSandbox();
  runSync(sandbox, ["init", "--root", sandbox.dir]);

  runSync(sandbox, [
    "emit",
    "--root",
    sandbox.dir,
    "--surface-id",
    "surfaces-web",
    "--source",
    "runtime",
    "--status",
    "warn",
    "--run-id",
    "run-1",
    "--idempotency-key",
    "idem-1",
    "--created-at",
    "2026-02-19T00:00:00.000Z",
  ]);

  runSync(sandbox, [
    "emit",
    "--root",
    sandbox.dir,
    "--surface-id",
    "surfaces-web",
    "--source",
    "runtime",
    "--status",
    "pass",
    "--run-id",
    "run-2",
    "--idempotency-key",
    "idem-1",
    "--created-at",
    "2026-02-19T01:00:00.000Z",
  ]);

  const runs = readRuns(sandbox);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].runId, "run-1");
  assert.equal(runs[0].idempotencyKey, "idem-1");
});

test("writer handles concurrent emits with deterministic ordering and lineage", async () => {
  const sandbox = makeSandbox();
  runSync(sandbox, ["init", "--root", sandbox.dir]);

  const jobs = [];
  for (let index = 0; index < 8; index += 1) {
    const runId = `run-${index}`;
    const createdAt =
      index % 2 === 0
        ? "2026-02-19T00:00:00.000Z"
        : `2026-02-19T00:00:0${index}.000Z`;
    jobs.push(
      runAsync(sandbox, [
        "emit",
        "--root",
        sandbox.dir,
        "--surface-id",
        "surfaces-web",
        "--source",
        "ci",
        "--status",
        index % 3 === 0 ? "fail" : "pass",
        "--run-id",
        runId,
        "--created-at",
        createdAt,
      ])
    );
  }

  await Promise.all(jobs);

  const runs = readRuns(sandbox);
  assert.equal(runs.length, 8);

  for (let i = 1; i < runs.length; i += 1) {
    const previous = runs[i - 1];
    const current = runs[i];
    const diff = Date.parse(previous.createdAt) - Date.parse(current.createdAt);
    if (diff > 0) {
      assert.fail("runs are not sorted by createdAt ascending");
    }
    if (diff === 0) {
      assert.ok(previous.runId.localeCompare(current.runId) <= 0);
    }
  }

  const lastRun = runs[runs.length - 1];
  const lineage = readLineage(sandbox);
  assert.equal(lineage["surfaces-web"].lastRunId, lastRun.runId);
  assert.equal(lineage["surfaces-web"].lastRunAt, lastRun.createdAt);
});
