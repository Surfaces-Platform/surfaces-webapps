#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const VALID_MODES = new Set(["advisory", "block"]);
const VALID_SOURCES = new Set(["bootstrap", "generation", "ci", "runtime"]);

function fail(message) {
  console.error(`[check-promotion-readiness] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || String(next).startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function compareRunsAscending(a, b) {
  const timeDiff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (timeDiff !== 0) return timeDiff;
  return String(a.runId).localeCompare(String(b.runId));
}

function compareRunsDesc(a, b) {
  const timeDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (timeDiff !== 0) return timeDiff;
  return String(b.runId).localeCompare(String(a.runId));
}

function stableContractString(contractDoc) {
  return `${JSON.stringify(contractDoc, null, 2)}\n`;
}

function normalizeRuns(rawRuns) {
  if (!Array.isArray(rawRuns)) return [];
  return rawRuns
    .filter((run) => run && typeof run === "object")
    .map((run) => {
      const source =
        typeof run.source === "string" && VALID_SOURCES.has(run.source)
          ? run.source
          : "unknown";
      const status =
        run.status === "pass" || run.status === "warn" || run.status === "fail" || run.status === "unknown"
          ? run.status
          : "unknown";
      const contract = run.contract && typeof run.contract === "object"
        ? {
            id: typeof run.contract.id === "string" ? run.contract.id : null,
            version: typeof run.contract.version === "string" ? run.contract.version : null,
            sha256: typeof run.contract.sha256 === "string" ? run.contract.sha256 : null,
          }
        : { id: null, version: null, sha256: null };
      const artifacts = run.artifacts && typeof run.artifacts === "object"
        ? {
            extractionPath:
              typeof run.artifacts.extractionPath === "string" ? run.artifacts.extractionPath : null,
            reportPath: typeof run.artifacts.reportPath === "string" ? run.artifacts.reportPath : null,
          }
        : { extractionPath: null, reportPath: null };
      const summary = run.summary && typeof run.summary === "object"
        ? {
            errorCount:
              typeof run.summary.errorCount === "number" && Number.isFinite(run.summary.errorCount)
                ? run.summary.errorCount
                : 0,
            warnCount:
              typeof run.summary.warnCount === "number" && Number.isFinite(run.summary.warnCount)
                ? run.summary.warnCount
                : 0,
          }
        : { errorCount: 0, warnCount: 0 };
      const findingCodes = Array.isArray(run.findingCodes)
        ? run.findingCodes.filter((entry) => typeof entry === "string" && entry.length > 0)
        : [];
      return {
        runId: typeof run.runId === "string" ? run.runId : "",
        createdAt: typeof run.createdAt === "string" ? run.createdAt : "",
        surfaceId: typeof run.surfaceId === "string" ? run.surfaceId : "",
        source,
        status,
        contract,
        artifacts,
        findingCodes,
        summary,
      };
    })
    .filter(
      (run) =>
        run.runId.length > 0 &&
        run.surfaceId.length > 0 &&
        run.source !== "unknown" &&
        !Number.isNaN(Date.parse(run.createdAt))
    );
}

function getSourcesArg(value) {
  if (!value) return ["ci", "runtime"];
  const parsed = String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (parsed.length === 0) return ["ci", "runtime"];
  const invalid = parsed.filter((entry) => !VALID_SOURCES.has(entry));
  if (invalid.length > 0) {
    fail(`Invalid --required-sources values: ${invalid.join(", ")}`);
  }
  return parsed;
}

function getSurfacesFromContract(contractDoc) {
  const surfaces = Array.isArray(contractDoc?.surfaces) ? contractDoc.surfaces : [];
  return surfaces
    .map((surface) => (surface && typeof surface.id === "string" ? surface.id : null))
    .filter(Boolean);
}

function fileExists(root, filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(root, filePath);
  return fs.existsSync(resolved);
}

function buildRecurringFindingCodes(runs, topN = 3) {
  const counts = {};
  for (const run of runs) {
    for (const code of run.findingCodes) {
      counts[code] = (counts[code] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code))
    .slice(0, topN);
}

function buildTimeToGreen(runs) {
  if (runs.length < 2) {
    return {
      latestMs: null,
      averageMs: null,
      samples: 0,
      insufficientHistory: true,
    };
  }

  const samples = [];
  let openFailureAt = null;
  for (const run of [...runs].sort(compareRunsAscending)) {
    const runAt = Date.parse(run.createdAt);
    if (Number.isNaN(runAt)) continue;

    if (run.status === "fail" || run.status === "warn" || run.status === "unknown") {
      if (openFailureAt === null) {
        openFailureAt = runAt;
      }
      continue;
    }

    if (run.status === "pass" && openFailureAt !== null) {
      const delta = runAt - openFailureAt;
      if (delta >= 0) {
        samples.push(delta);
      }
      openFailureAt = null;
    }
  }

  if (samples.length === 0) {
    return {
      latestMs: null,
      averageMs: null,
      samples: 0,
      insufficientHistory: true,
    };
  }

  const sum = samples.reduce((total, value) => total + value, 0);
  return {
    latestMs: samples[samples.length - 1],
    averageMs: Math.round(sum / samples.length),
    samples: samples.length,
    insufficientHistory: false,
  };
}

function buildSourceKpi(runs, source) {
  const orderedRuns = [...runs].sort(compareRunsDesc);
  const totalRuns = orderedRuns.length;
  const passedRuns = orderedRuns.filter((run) => run.status === "pass").length;
  const nonFailingRuns = orderedRuns.filter((run) => run.status === "pass" || run.status === "warn").length;
  const blockingRuns = orderedRuns.filter((run) => run.status === "fail").length;
  return {
    source,
    totalRuns,
    passedRuns,
    nonFailingRuns,
    blockingRuns,
    passRate: totalRuns > 0 ? Number((passedRuns / totalRuns).toFixed(4)) : null,
    blockingRate: totalRuns > 0 ? Number((blockingRuns / totalRuns).toFixed(4)) : null,
    recurringFindingCodes: buildRecurringFindingCodes(orderedRuns),
    timeToGreen: buildTimeToGreen(orderedRuns),
    latestRun: orderedRuns[0] ?? null,
  };
}

function runMatchesContract(run, contractSummary) {
  return (
    run.contract.id === contractSummary.id &&
    run.contract.version === contractSummary.version &&
    run.contract.sha256 === contractSummary.sha256
  );
}

function buildSourceCheck({
  root,
  source,
  runs,
  now,
  freshnessMs,
  freshnessDays,
  contractSummary,
}) {
  const latest = [...runs].sort(compareRunsDesc)[0] ?? null;

  if (!latest) {
    return {
      source,
      ready: false,
      code: "promotion.missing-source-run",
      message: `No ${source} run found for ${contractSummary.surfaceId}`,
      latestRun: null,
    };
  }

  const latestAt = Date.parse(latest.createdAt);
  if (now - latestAt > freshnessMs) {
    return {
      source,
      ready: false,
      code: "promotion.stale-run",
      message: `${source} latest run is older than freshness window (${freshnessDays}d)`,
      latestRun: latest,
    };
  }

  if (latest.status === "unknown") {
    return {
      source,
      ready: false,
      code: "promotion.latest-run-unknown",
      message: `${source} latest run did not produce a usable status`,
      latestRun: latest,
    };
  }

  if (latest.status === "fail") {
    return {
      source,
      ready: false,
      code: "promotion.latest-run-failed",
      message: `${source} latest run is fail`,
      latestRun: latest,
    };
  }

  if (!runMatchesContract(latest, contractSummary)) {
    return {
      source,
      ready: false,
      code: "promotion.contract-mismatch",
      message: `${source} latest run does not match the current contract revision`,
      latestRun: latest,
    };
  }

  if (!fileExists(root, latest.artifacts.reportPath)) {
    return {
      source,
      ready: false,
      code: "promotion.missing-provenance",
      message: `${source} latest run is missing a readable report artifact`,
      latestRun: latest,
    };
  }

  return {
    source,
    ready: true,
    code: "promotion.ready",
    message: `${source} latest run is fresh, matches the current contract, and has report evidence`,
    latestRun: latest,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root || process.cwd());
  const mode = typeof args.mode === "string" ? args.mode : "advisory";
  if (!VALID_MODES.has(mode)) {
    fail(`Invalid --mode value: ${mode} (expected advisory|block)`);
  }

  const freshnessDaysRaw = args["freshness-days"];
  const freshnessDays = freshnessDaysRaw === undefined ? 7 : Number(freshnessDaysRaw);
  if (!Number.isFinite(freshnessDays) || freshnessDays < 0) {
    fail(`Invalid --freshness-days value: ${freshnessDaysRaw}`);
  }

  const requiredSources = getSourcesArg(args["required-sources"]);
  const contractPath = path.resolve(root, args.contract || "contracts/surfaces.web.contract.json");
  const runsPath = path.resolve(root, args.runs || "contracts/generated/contract-runs.json");
  const outputPath = path.resolve(root, args.output || "artifacts/promotion-readiness.json");

  const contractDoc = readJson(contractPath, null);
  if (!contractDoc) {
    fail(`Unable to read contract JSON at ${path.relative(root, contractPath)}`);
  }

  const configuredSurfaces =
    typeof args.surfaces === "string" && args.surfaces.trim().length > 0
      ? args.surfaces
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : getSurfacesFromContract(contractDoc);

  if (configuredSurfaces.length === 0) {
    fail("No target surfaces found. Provide --surfaces or ensure contract has surfaces[].id");
  }

  const runsDoc = readJson(runsPath, { schemaVersion: 1, runs: [] });
  const runs = normalizeRuns(runsDoc?.runs);
  const now = Date.now();
  const freshnessMs = freshnessDays * 24 * 60 * 60 * 1000;
  const contractSummary = {
    path: path.relative(root, contractPath),
    id: typeof contractDoc.contractId === "string" ? contractDoc.contractId : "unknown",
    version: typeof contractDoc.version === "string" ? contractDoc.version : "unknown",
    sha256: createHash("sha256").update(stableContractString(contractDoc)).digest("hex"),
  };

  const surfaceResults = configuredSurfaces.map((surfaceId) => {
    const surfaceContractSummary = { ...contractSummary, surfaceId };
    const checks = requiredSources.map((source) =>
      buildSourceCheck({
        root,
        source,
        runs: runs.filter((run) => run.surfaceId === surfaceId && run.source === source),
        now,
        freshnessMs,
        freshnessDays,
        contractSummary: surfaceContractSummary,
      })
    );

    return {
      surfaceId,
      ready: checks.every((check) => check.ready),
      checks,
      sourceKpis: requiredSources.map((source) =>
        buildSourceKpi(
          runs.filter((run) => run.surfaceId === surfaceId && run.source === source),
          source,
        )
      ),
    };
  });

  const readySurfaces = surfaceResults.filter((result) => result.ready).length;
  const notReadySurfaces = surfaceResults.length - readySurfaces;
  const report = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    mode,
    freshnessDays,
    requiredSources,
    contract: contractSummary,
    summary: {
      totalSurfaces: surfaceResults.length,
      readySurfaces,
      notReadySurfaces,
      readyForPromotion: notReadySurfaces === 0,
    },
    surfaces: surfaceResults,
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const relativeOutput = path.relative(root, outputPath);
  console.log(`[check-promotion-readiness] Wrote ${relativeOutput}`);
  console.log(
    `[check-promotion-readiness] ready=${report.summary.readySurfaces}/${report.summary.totalSurfaces} mode=${mode}`
  );

  if (mode === "block" && !report.summary.readyForPromotion) {
    process.exit(1);
  }
}

main();
