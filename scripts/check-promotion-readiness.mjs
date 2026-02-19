#!/usr/bin/env node

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

function compareRunsDesc(a, b) {
  const timeDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (timeDiff !== 0) return timeDiff;
  return String(b.runId).localeCompare(String(a.runId));
}

function normalizeRuns(rawRuns) {
  if (!Array.isArray(rawRuns)) return [];
  return rawRuns
    .filter((run) => run && typeof run === "object")
    .map((run) => {
      const source = typeof run.source === "string" && VALID_SOURCES.has(run.source)
        ? run.source
        : "unknown";
      const status =
        run.status === "pass" || run.status === "warn" || run.status === "fail" || run.status === "unknown"
          ? run.status
          : "unknown";
      return {
        runId: typeof run.runId === "string" ? run.runId : "",
        createdAt: typeof run.createdAt === "string" ? run.createdAt : "",
        surfaceId: typeof run.surfaceId === "string" ? run.surfaceId : "",
        source,
        status,
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

  const surfaceResults = configuredSurfaces.map((surfaceId) => {
    const checks = requiredSources.map((source) => {
      const latest = runs
        .filter((run) => run.surfaceId === surfaceId && run.source === source)
        .sort(compareRunsDesc)[0];

      if (!latest) {
        return {
          source,
          ready: false,
          code: "promotion.missing-source-run",
          message: `No ${source} run found for ${surfaceId}`,
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

      if (latest.status === "fail") {
        return {
          source,
          ready: false,
          code: "promotion.latest-run-failed",
          message: `${source} latest run is fail`,
          latestRun: latest,
        };
      }

      return {
        source,
        ready: true,
        code: "promotion.ready",
        message: `${source} latest run is fresh and non-failing`,
        latestRun: latest,
      };
    });

    return {
      surfaceId,
      ready: checks.every((check) => check.ready),
      checks,
    };
  });

  const readySurfaces = surfaceResults.filter((result) => result.ready).length;
  const notReadySurfaces = surfaceResults.length - readySurfaces;
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode,
    freshnessDays,
    requiredSources,
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
