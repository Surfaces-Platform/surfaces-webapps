#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const generatedDir = path.join(root, "contracts", "generated");
const runsPath = path.join(generatedDir, "contract-runs.json");
const lineagePath = path.join(generatedDir, "contract-lineage.json");

function fail(message) {
  console.error(`[validate-run-artifacts] ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) fail(`Missing required file: ${path.relative(root, filePath)}`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Invalid JSON in ${path.relative(root, filePath)}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function isStatus(value) {
  return value === "pass" || value === "warn" || value === "fail" || value === "unknown";
}

function isSource(value) {
  return value === "bootstrap" || value === "generation" || value === "ci" || value === "runtime";
}

function compareRunOrder(a, b) {
  const timeDiff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (timeDiff !== 0) return timeDiff;
  return String(a.runId).localeCompare(String(b.runId));
}

function validateRunsDoc(doc) {
  assert(doc && typeof doc === "object", "contract-runs.json must be an object");
  assert(
    doc.schemaVersion === 1 || doc.schemaVersion === 2,
    "contract-runs.json schemaVersion must be 1 or 2"
  );
  assert(Array.isArray(doc.runs), "contract-runs.json runs must be an array");

  const ids = new Set();
  const runIds = new Set();
  const idempotencyKeys = new Set();
  const latestBySurface = new Map();
  for (const [index, run] of doc.runs.entries()) {
    const prefix = `contract-runs.json runs[${index}]`;
    assert(run && typeof run === "object", `${prefix} must be an object`);
    const workspaceId = run.workspaceId ?? "ws-local-default";
    assert(
      typeof workspaceId === "string" && workspaceId.length > 0,
      `${prefix}.workspaceId must be a non-empty string when present`
    );
    assert(typeof run.runId === "string" && run.runId.length > 0, `${prefix}.runId must be a non-empty string`);
    const runKey = `${workspaceId}:${run.runId}`;
    assert(!ids.has(runKey), `${prefix}.runId must be unique per workspace (${run.runId})`);
    ids.add(runKey);
    runIds.add(run.runId);
    if (index > 0) {
      const previous = doc.runs[index - 1];
      assert(
        compareRunOrder(previous, run) <= 0,
        `${prefix} must preserve deterministic ascending order by createdAt then runId`
      );
    }
    assert(typeof run.createdAt === "string" && !Number.isNaN(Date.parse(run.createdAt)), `${prefix}.createdAt must be ISO-8601`);
    if (run.ingestedAt !== undefined) {
      assert(
        typeof run.ingestedAt === "string" && !Number.isNaN(Date.parse(run.ingestedAt)),
        `${prefix}.ingestedAt must be ISO-8601 when present`
      );
    }
    if (run.idempotencyKey !== undefined) {
      assert(
        typeof run.idempotencyKey === "string" && run.idempotencyKey.length > 0,
        `${prefix}.idempotencyKey must be a non-empty string when present`
      );
      const idempotencyKey = `${workspaceId}:${run.idempotencyKey}`;
      assert(
        !idempotencyKeys.has(idempotencyKey),
        `${prefix}.idempotencyKey must be unique per workspace (${run.idempotencyKey})`
      );
      idempotencyKeys.add(idempotencyKey);
    }
    assert(typeof run.surfaceId === "string" && run.surfaceId.length > 0, `${prefix}.surfaceId must be a non-empty string`);
    assert(isSource(run.source), `${prefix}.source must be bootstrap|generation|ci|runtime`);
    assert(isStatus(run.status), `${prefix}.status must be pass|warn|fail|unknown`);
    assert(run.contract && typeof run.contract === "object", `${prefix}.contract must be an object`);
    assert(typeof run.contract.id === "string" && run.contract.id.length > 0, `${prefix}.contract.id must be a non-empty string`);
    assert(typeof run.contract.version === "string" && run.contract.version.length > 0, `${prefix}.contract.version must be a non-empty string`);
    assert(typeof run.contract.sha256 === "string" && /^[a-f0-9]{64}$/i.test(run.contract.sha256), `${prefix}.contract.sha256 must be a SHA-256 hex string`);
    assert(run.artifacts && typeof run.artifacts === "object", `${prefix}.artifacts must be an object`);
    if (run.artifacts.extractionPath !== undefined) {
      assert(typeof run.artifacts.extractionPath === "string", `${prefix}.artifacts.extractionPath must be a string`);
    }
    if (run.artifacts.reportPath !== undefined) {
      assert(typeof run.artifacts.reportPath === "string", `${prefix}.artifacts.reportPath must be a string`);
    }
    assert(Array.isArray(run.findingCodes), `${prefix}.findingCodes must be an array`);
    assert(run.findingCodes.every((code) => typeof code === "string"), `${prefix}.findingCodes entries must be strings`);
    assert(run.summary && typeof run.summary === "object", `${prefix}.summary must be an object`);
    assert(typeof run.summary.errorCount === "number" && run.summary.errorCount >= 0, `${prefix}.summary.errorCount must be >= 0`);
    assert(typeof run.summary.warnCount === "number" && run.summary.warnCount >= 0, `${prefix}.summary.warnCount must be >= 0`);
    latestBySurface.set(run.surfaceId, run);
  }

  return {
    ids,
    runIds,
    latestBySurface,
  };
}

function validateLineageDoc(doc, runsValidation) {
  assert(doc && typeof doc === "object", "contract-lineage.json must be an object");
  assert(doc.schemaVersion === 1, "contract-lineage.json schemaVersion must be 1");
  assert(doc.surfaces && typeof doc.surfaces === "object" && !Array.isArray(doc.surfaces), "contract-lineage.json surfaces must be an object map");

  for (const [surfaceId, record] of Object.entries(doc.surfaces)) {
    const prefix = `contract-lineage.json surfaces.${surfaceId}`;
    assert(record && typeof record === "object", `${prefix} must be an object`);
    assert(typeof record.lastRunId === "string" && record.lastRunId.length > 0, `${prefix}.lastRunId must be a non-empty string`);
    assert(typeof record.lastRunAt === "string" && !Number.isNaN(Date.parse(record.lastRunAt)), `${prefix}.lastRunAt must be ISO-8601`);
    assert(isSource(record.lastSource), `${prefix}.lastSource must be bootstrap|generation|ci|runtime`);
    assert(isStatus(record.lastStatus), `${prefix}.lastStatus must be pass|warn|fail|unknown`);
    assert(record.contract && typeof record.contract === "object", `${prefix}.contract must be an object`);
    assert(typeof record.contract.id === "string" && record.contract.id.length > 0, `${prefix}.contract.id must be non-empty`);
    assert(typeof record.contract.version === "string" && record.contract.version.length > 0, `${prefix}.contract.version must be non-empty`);
    assert(typeof record.contract.sha256 === "string" && /^[a-f0-9]{64}$/i.test(record.contract.sha256), `${prefix}.contract.sha256 must be SHA-256 hex`);
    assert(record.artifacts && typeof record.artifacts === "object", `${prefix}.artifacts must be an object`);
    if (record.artifacts.extractionPath !== undefined) {
      assert(typeof record.artifacts.extractionPath === "string", `${prefix}.artifacts.extractionPath must be a string`);
    }
    if (record.artifacts.reportPath !== undefined) {
      assert(typeof record.artifacts.reportPath === "string", `${prefix}.artifacts.reportPath must be a string`);
    }
    assert(Array.isArray(record.findingCodes), `${prefix}.findingCodes must be an array`);
    assert(record.findingCodes.every((code) => typeof code === "string"), `${prefix}.findingCodes entries must be strings`);
    assert(
      runsValidation.runIds.has(record.lastRunId),
      `${prefix}.lastRunId must reference an existing run (${record.lastRunId})`
    );
    const latestRun = runsValidation.latestBySurface.get(surfaceId);
    assert(Boolean(latestRun), `${prefix} must have at least one run for surface ${surfaceId}`);
    assert(record.lastRunId === latestRun.runId, `${prefix}.lastRunId must match latest runId for ${surfaceId}`);
    assert(record.lastRunAt === latestRun.createdAt, `${prefix}.lastRunAt must match latest run createdAt for ${surfaceId}`);
    assert(record.lastSource === latestRun.source, `${prefix}.lastSource must match latest run source for ${surfaceId}`);
    assert(record.lastStatus === latestRun.status, `${prefix}.lastStatus must match latest run status for ${surfaceId}`);
  }

  for (const surfaceId of runsValidation.latestBySurface.keys()) {
    assert(
      Object.prototype.hasOwnProperty.call(doc.surfaces, surfaceId),
      `contract-lineage.json missing surface record for latest run surface ${surfaceId}`
    );
  }
}

const runs = readJson(runsPath);
const lineage = readJson(lineagePath);
const runsValidation = validateRunsDoc(runs);
validateLineageDoc(lineage, runsValidation);

console.log("[validate-run-artifacts] OK");
