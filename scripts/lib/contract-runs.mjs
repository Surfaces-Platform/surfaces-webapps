#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const LOCK_TIMEOUT_MS = 5_000;
const LOCK_POLL_MS = 25;

function fail(message) {
  console.error(`[contract-runs] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next === undefined || (typeof next === "string" && next.startsWith("--"))) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

function ensureFile(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(filePath, payload) {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function acquireLock(lockPath, timeoutMs = LOCK_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      fs.mkdirSync(lockPath);
      return;
    } catch (error) {
      if (error && error.code !== "EEXIST") {
        throw error;
      }
      sleep(LOCK_POLL_MS);
    }
  }
  fail(`Timed out acquiring lock: ${lockPath}`);
}

function releaseLock(lockPath) {
  try {
    fs.rmdirSync(lockPath);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }
}

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

function initArtifacts(root) {
  const generatedDir = path.join(root, "contracts", "generated");
  fs.mkdirSync(generatedDir, { recursive: true });

  ensureFile(path.join(generatedDir, "contract-runs.json"), {
    schemaVersion: 2,
    runs: [],
  });

  ensureFile(path.join(generatedDir, "contract-lineage.json"), {
    schemaVersion: 1,
    surfaces: {},
  });
}

function parseCodes(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function toRelative(root, candidate) {
  if (!candidate) return undefined;
  if (candidate.startsWith("/")) return path.relative(root, candidate);
  return candidate;
}

function statusSummary(status, findingCodes) {
  const errorCount = status === "fail" ? Math.max(1, findingCodes.length) : 0;
  const warnCount = status === "warn" ? Math.max(1, findingCodes.length) : 0;
  return { errorCount, warnCount };
}

function sortRunsDeterministic(runs) {
  return [...runs].sort((a, b) => {
    const timeDiff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    if (timeDiff !== 0) return timeDiff;
    return String(a.runId).localeCompare(String(b.runId));
  });
}

function latestRunsBySurface(runs) {
  const map = new Map();
  for (const run of runs) {
    map.set(run.surfaceId, run);
  }
  return map;
}

function rebuildLineageFromRuns(runs) {
  const surfaces = {};
  for (const [surfaceId, run] of latestRunsBySurface(runs).entries()) {
    surfaces[surfaceId] = {
      lastRunId: run.runId,
      lastRunAt: run.createdAt,
      lastSource: run.source,
      lastStatus: run.status,
      contract: run.contract,
      artifacts: run.artifacts,
      findingCodes: run.findingCodes,
    };
  }
  return { schemaVersion: 1, surfaces };
}

function emitRun(root, args) {
  const surfaceId = args["surface-id"];
  const source = args.source;
  const status = args.status;

  if (!surfaceId) fail("Missing --surface-id");
  if (!source) fail("Missing --source (bootstrap|generation|ci|runtime)");
  if (!["bootstrap", "generation", "ci", "runtime"].includes(source)) {
    fail(`Unsupported --source value: ${source}`);
  }
  if (!status || !["pass", "warn", "fail", "unknown"].includes(status)) {
    fail("Missing/invalid --status (pass|warn|fail|unknown)");
  }

  const generatedDir = path.join(root, "contracts", "generated");
  const contractPath = path.join(root, "contracts", "surfaces.web.contract.json");
  const runsPath = path.join(generatedDir, "contract-runs.json");
  const lineagePath = path.join(generatedDir, "contract-lineage.json");

  if (!fs.existsSync(contractPath)) fail(`Canonical contract not found: ${contractPath}`);

  initArtifacts(root);

  const contract = readJson(contractPath, null);
  if (!contract) fail(`Failed to parse canonical contract: ${contractPath}`);

  const createdAt = args["created-at"] || new Date().toISOString();
  if (Number.isNaN(Date.parse(createdAt))) {
    fail(`Invalid --created-at value: ${createdAt}`);
  }
  const findingCodes = parseCodes(args["finding-codes"]);
  const runId = args["run-id"] || randomUUID();
  const workspaceId =
    typeof args["workspace-id"] === "string" && args["workspace-id"].trim().length > 0
      ? args["workspace-id"].trim()
      : "ws-local-default";
  const idempotencyKey =
    typeof args["idempotency-key"] === "string" && args["idempotency-key"].trim().length > 0
      ? args["idempotency-key"].trim()
      : undefined;
  const ingestedAt = new Date().toISOString();

  const runRecord = {
    runId,
    workspaceId,
    idempotencyKey,
    ingestedAt,
    createdAt,
    surfaceId,
    source,
    contract: {
      id: contract.contractId || "unknown",
      version: contract.version || "unknown",
      sha256: sha256File(contractPath),
    },
    artifacts: {
      extractionPath: toRelative(root, args["extraction-path"]),
      reportPath: toRelative(root, args["report-path"]),
    },
    status,
    findingCodes,
    summary: statusSummary(status, findingCodes),
  };

  const lockPath = path.join(generatedDir, "contract-runs.lock");
  acquireLock(lockPath);
  try {
    const runsDoc = readJson(runsPath, { schemaVersion: 2, runs: [] });
    if (!Array.isArray(runsDoc.runs)) runsDoc.runs = [];

    const duplicateByRunId = runsDoc.runs.some(
      (run) =>
        run &&
        (run.workspaceId || "ws-local-default") === workspaceId &&
        run.runId === runRecord.runId
    );
    const duplicateByIdempotencyKey =
      Boolean(idempotencyKey) &&
      runsDoc.runs.some(
        (run) =>
          run &&
          (run.workspaceId || "ws-local-default") === workspaceId &&
          typeof run.idempotencyKey === "string" &&
          run.idempotencyKey === idempotencyKey,
      );

    const nextRuns = duplicateByRunId || duplicateByIdempotencyKey
      ? runsDoc.runs
      : sortRunsDeterministic([...runsDoc.runs, runRecord]);

    const nextRunsDoc = {
      schemaVersion: 2,
      runs: nextRuns,
    };
    const nextLineageDoc = rebuildLineageFromRuns(nextRuns);

    writeJsonAtomic(runsPath, nextRunsDoc);
    writeJsonAtomic(lineagePath, nextLineageDoc);

    const effectiveRun = duplicateByRunId || duplicateByIdempotencyKey
      ? nextRuns.find(
        (run) =>
          run.runId === runRecord.runId ||
            (idempotencyKey && run.idempotencyKey === idempotencyKey),
      ) || runRecord
      : runRecord;

    console.log(
      JSON.stringify(
        {
          ok: true,
          deduped: Boolean(duplicateByRunId || duplicateByIdempotencyKey),
          runId: effectiveRun.runId,
          surfaceId: effectiveRun.surfaceId,
        },
        null,
        2,
      ),
    );
  } finally {
    releaseLock(lockPath);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const root = path.resolve(args.root || process.cwd());

  if (!command || !["init", "emit"].includes(command)) {
    fail(
      "Usage: node scripts/lib/contract-runs.mjs <init|emit> [--root <path>] [--idempotency-key <key>] ...",
    );
  }

  if (command === "init") {
    initArtifacts(root);
    console.log(JSON.stringify({ ok: true, initialized: true }, null, 2));
    return;
  }

  emitRun(root, args);
}

main();
