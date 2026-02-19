import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "run-artifacts-"));
  const generated = path.join(dir, "contracts", "generated");
  fs.mkdirSync(generated, { recursive: true });
  fs.mkdirSync(path.join(dir, "scripts"), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, "scripts", "validate-run-artifacts.mjs"),
    path.join(dir, "scripts", "validate-run-artifacts.mjs")
  );

  return { dir, generated };
}

test("validate-run-artifacts passes for valid files", () => {
  const { dir, generated } = makeSandbox();
  fs.writeFileSync(
    path.join(generated, "contract-runs.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        runs: [
          {
            runId: "run-1",
            workspaceId: "ws-test",
            createdAt: "2026-02-09T00:00:00.000Z",
            surfaceId: "surfaces-web",
            source: "bootstrap",
            contract: {
              id: "surfaces.web",
              version: "0.1.0",
              sha256: "a".repeat(64),
            },
            artifacts: {
              extractionPath: "contracts/generated/surfaces-web.extraction.json",
            },
            status: "pass",
            findingCodes: [],
            summary: { errorCount: 0, warnCount: 0 },
          },
        ],
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(generated, "contract-lineage.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        surfaces: {
          "surfaces-web": {
            lastRunId: "run-1",
            lastRunAt: "2026-02-09T00:00:00.000Z",
            lastSource: "bootstrap",
            lastStatus: "pass",
            contract: {
              id: "surfaces.web",
              version: "0.1.0",
              sha256: "a".repeat(64),
            },
            artifacts: {
              extractionPath: "contracts/generated/surfaces-web.extraction.json",
            },
            findingCodes: [],
          },
        },
      },
      null,
      2
    )
  );

  const result = spawnSync("node", ["scripts/validate-run-artifacts.mjs"], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /OK/);
});

test("validate-run-artifacts fails for invalid files", () => {
  const { dir, generated } = makeSandbox();
  fs.writeFileSync(
    path.join(generated, "contract-runs.json"),
    JSON.stringify({ schemaVersion: 3, runs: [] }, null, 2)
  );
  fs.writeFileSync(
    path.join(generated, "contract-lineage.json"),
    JSON.stringify({ schemaVersion: 1, surfaces: {} }, null, 2)
  );

  const result = spawnSync("node", ["scripts/validate-run-artifacts.mjs"], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /schemaVersion must be 1 or 2/);
});

test("validate-run-artifacts fails when runs are out of deterministic order", () => {
  const { dir, generated } = makeSandbox();
  fs.writeFileSync(
    path.join(generated, "contract-runs.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        runs: [
          {
            runId: "run-b",
            workspaceId: "ws-test",
            createdAt: "2026-02-09T01:00:00.000Z",
            surfaceId: "surfaces-web",
            source: "ci",
            contract: { id: "surfaces.web", version: "0.1.0", sha256: "a".repeat(64) },
            artifacts: {},
            status: "pass",
            findingCodes: [],
            summary: { errorCount: 0, warnCount: 0 },
          },
          {
            runId: "run-a",
            workspaceId: "ws-test",
            createdAt: "2026-02-09T00:00:00.000Z",
            surfaceId: "surfaces-web",
            source: "ci",
            contract: { id: "surfaces.web", version: "0.1.0", sha256: "a".repeat(64) },
            artifacts: {},
            status: "pass",
            findingCodes: [],
            summary: { errorCount: 0, warnCount: 0 },
          },
        ],
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(generated, "contract-lineage.json"),
    JSON.stringify({ schemaVersion: 1, surfaces: {} }, null, 2)
  );

  const result = spawnSync("node", ["scripts/validate-run-artifacts.mjs"], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /deterministic ascending order/);
});

test("validate-run-artifacts fails when lineage does not match latest run", () => {
  const { dir, generated } = makeSandbox();
  fs.writeFileSync(
    path.join(generated, "contract-runs.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        runs: [
          {
            runId: "run-1",
            workspaceId: "ws-test",
            idempotencyKey: "idem-1",
            ingestedAt: "2026-02-09T00:00:00.000Z",
            createdAt: "2026-02-09T00:00:00.000Z",
            surfaceId: "surfaces-web",
            source: "ci",
            contract: { id: "surfaces.web", version: "0.1.0", sha256: "a".repeat(64) },
            artifacts: {},
            status: "pass",
            findingCodes: [],
            summary: { errorCount: 0, warnCount: 0 },
          },
          {
            runId: "run-2",
            workspaceId: "ws-test",
            createdAt: "2026-02-09T01:00:00.000Z",
            surfaceId: "surfaces-web",
            source: "runtime",
            contract: { id: "surfaces.web", version: "0.1.0", sha256: "a".repeat(64) },
            artifacts: {},
            status: "warn",
            findingCodes: ["x"],
            summary: { errorCount: 0, warnCount: 1 },
          },
        ],
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(generated, "contract-lineage.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        surfaces: {
          "surfaces-web": {
            lastRunId: "run-1",
            lastRunAt: "2026-02-09T00:00:00.000Z",
            lastSource: "ci",
            lastStatus: "pass",
            contract: { id: "surfaces.web", version: "0.1.0", sha256: "a".repeat(64) },
            artifacts: {},
            findingCodes: [],
          },
        },
      },
      null,
      2
    )
  );

  const result = spawnSync("node", ["scripts/validate-run-artifacts.mjs"], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr || result.stdout, /must match latest runId/);
});
