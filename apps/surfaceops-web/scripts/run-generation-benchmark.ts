import {
  BENCHMARK_FIXTURE_IDS,
  getBenchmarkFixtureProfile,
} from "../lib/local-workbench/benchmark-fixtures";
import { runBenchmarkCohort } from "../lib/local-workbench/service";

function printUsage(): void {
  process.stdout.write(
    [
      "Usage: tsx scripts/run-generation-benchmark.ts (--fixture-id <id|all> | --spec <path>) [--cohort-id <id>]",
      "",
      "Options:",
      `  --fixture-id <id|all>  Benchmark one fixture or the full suite (${BENCHMARK_FIXTURE_IDS.join(", ")}).`,
      "  --spec <path>         Replay a frozen benchmark spec.",
      "  --cohort-id <id>      Override the default timestamp-based cohort id.",
      "  --requested-model-label <label>  Record a human-stable requested model label (for example gpt-oss-20b).",
      "  --resolved-model-id <id>         Override the resolved runtime model id (defaults from SURFACEOPS_LOCAL_LLM_MODEL).",
      "  --source-run <path>   Optional source benchmark run when replaying a spec.",
      "  --help               Show this help text.",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): {
  fixtureId?: string;
  specPath?: string;
  cohortId?: string;
  requestedModelLabel?: string;
  resolvedModelId?: string;
  sourceRunPath?: string;
} {
  let fixtureId: string | undefined;
  let specPath: string | undefined;
  let cohortId: string | undefined;
  let requestedModelLabel: string | undefined;
  let resolvedModelId: string | undefined;
  let sourceRunPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--help") {
      printUsage();
      process.exit(0);
    }
    if (arg === "--fixture-id") {
      fixtureId = argv[index + 1]?.trim() ?? "";
      if (!fixtureId) {
        throw new Error("--fixture-id requires a value.");
      }
      index += 1;
      continue;
    }
    if (arg === "--spec") {
      specPath = argv[index + 1]?.trim() ?? "";
      if (!specPath) {
        throw new Error("--spec requires a value.");
      }
      index += 1;
      continue;
    }
    if (arg === "--cohort-id") {
      cohortId = argv[index + 1]?.trim();
      if (!cohortId) {
        throw new Error("--cohort-id requires a value.");
      }
      index += 1;
      continue;
    }
    if (arg === "--requested-model-label") {
      requestedModelLabel = argv[index + 1]?.trim() ?? "";
      if (!requestedModelLabel) {
        throw new Error("--requested-model-label requires a value.");
      }
      index += 1;
      continue;
    }
    if (arg === "--resolved-model-id") {
      resolvedModelId = argv[index + 1]?.trim() ?? "";
      if (!resolvedModelId) {
        throw new Error("--resolved-model-id requires a value.");
      }
      index += 1;
      continue;
    }
    if (arg === "--source-run") {
      sourceRunPath = argv[index + 1]?.trim() ?? "";
      if (!sourceRunPath) {
        throw new Error("--source-run requires a value.");
      }
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!fixtureId && !specPath) {
    throw new Error("Either --fixture-id or --spec is required.");
  }
  if (fixtureId && specPath) {
    throw new Error("Use either --fixture-id or --spec, not both.");
  }

  return { fixtureId, specPath, cohortId, requestedModelLabel, resolvedModelId, sourceRunPath };
}

async function main(): Promise<void> {
  const { fixtureId, specPath, cohortId, requestedModelLabel, resolvedModelId, sourceRunPath } = parseArgs(process.argv.slice(2));
  const fixtureIds = fixtureId ? (fixtureId === "all" ? BENCHMARK_FIXTURE_IDS : [fixtureId]) : undefined;
  const defaultStrategies = fixtureIds?.length ? getBenchmarkFixtureProfile(fixtureIds[0]!).defaultStrategies : [];
  const result = await runBenchmarkCohort({
    fixtureIds,
    benchmarkSpecPath: specPath,
    cohortId,
    strategies: fixtureIds ? (["unguided", ...defaultStrategies] as const) : undefined,
    requestedModelLabel,
    resolvedModelId,
    sourceRunPath,
  });

  process.stdout.write(
    [
      `Benchmark cohort: ${result.cohortId}`,
      `Fixtures: ${result.surfaceIds.join(", ")}`,
      `Benchmark dir: ${result.benchmarkDir}`,
      `Spec: ${result.specPath}`,
      `Run: ${result.runPath}`,
      `Report: ${result.reportPath ?? "not written"}`,
      `Comparisons: ${result.comparisonPaths.join(", ") || "none"}`,
    ].join("\n") + "\n",
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
