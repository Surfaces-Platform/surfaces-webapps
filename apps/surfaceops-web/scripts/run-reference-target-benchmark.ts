import { runReferenceTargetBenchmarkCohort } from "../lib/local-workbench/service";
import { REFERENCE_TARGET_BENCHMARK_PROFILE } from "../lib/local-workbench/reference-target";

function printUsage(): void {
  process.stdout.write(
    [
      "Usage: tsx scripts/run-reference-target-benchmark.ts [--include-unguided] [--cohort-id <id>]",
      "",
      "Options:",
      "  --include-unguided  Add the unguided control arm to the default prompt-summary vs json-primary cohort.",
      "  --cohort-id <id>    Override the default timestamp-based cohort id.",
      "  --help             Show this help text.",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): { includeUnguided: boolean; cohortId?: string } {
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

  return { includeUnguided, cohortId };
}

async function main(): Promise<void> {
  const { includeUnguided, cohortId } = parseArgs(process.argv.slice(2));
  const strategies = includeUnguided
    ? (["unguided", ...REFERENCE_TARGET_BENCHMARK_PROFILE.defaultStrategies] as const)
    : REFERENCE_TARGET_BENCHMARK_PROFILE.defaultStrategies;
  const result = await runReferenceTargetBenchmarkCohort({
    cohortId,
    strategies: [...strategies],
  });

  process.stdout.write(
    [
      `Benchmark cohort: ${result.cohortId}`,
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
