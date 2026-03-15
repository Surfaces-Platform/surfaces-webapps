import {
  BENCHMARK_FIXTURE_IDS,
  getBenchmarkFixtureProfile,
} from "../lib/local-workbench/benchmark-fixtures";
import { runBenchmarkCohort } from "../lib/local-workbench/service";

function printUsage(): void {
  process.stdout.write(
    [
      "Usage: tsx scripts/run-generation-benchmark.ts --fixture-id <id|all> [--include-unguided] [--cohort-id <id>]",
      "",
      "Options:",
      `  --fixture-id <id|all>  Benchmark one fixture or the full suite (${BENCHMARK_FIXTURE_IDS.join(", ")}).`,
      "  --include-unguided    Add the unguided control arm to the default prompt-summary vs json-primary cohort.",
      "  --cohort-id <id>      Override the default timestamp-based cohort id.",
      "  --help               Show this help text.",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): {
  fixtureId: string;
  includeUnguided: boolean;
  cohortId?: string;
} {
  let fixtureId = "";
  let includeUnguided = false;
  let cohortId: string | undefined;

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
    if (arg === "--include-unguided") {
      includeUnguided = true;
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
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!fixtureId) {
    throw new Error("--fixture-id is required.");
  }

  return { fixtureId, includeUnguided, cohortId };
}

async function main(): Promise<void> {
  const { fixtureId, includeUnguided, cohortId } = parseArgs(process.argv.slice(2));
  const fixtureIds = fixtureId === "all" ? BENCHMARK_FIXTURE_IDS : [fixtureId];
  const defaultStrategies = getBenchmarkFixtureProfile(fixtureIds[0]!).defaultStrategies;
  const strategies = includeUnguided
    ? (["unguided", ...defaultStrategies] as const)
    : defaultStrategies;
  const result = await runBenchmarkCohort({
    fixtureIds,
    cohortId,
    strategies: [...strategies],
  });

  process.stdout.write(
    [
      `Benchmark cohort: ${result.cohortId}`,
      `Fixtures: ${result.surfaceIds.join(", ")}`,
      `Benchmark dir: ${result.benchmarkDir}`,
      `Manifest: ${result.manifestPath}`,
      `Report: ${result.reportPath ?? "not written"}`,
      `Comparisons: ${result.comparisonPaths.join(", ") || "none"}`,
    ].join("\n") + "\n",
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
