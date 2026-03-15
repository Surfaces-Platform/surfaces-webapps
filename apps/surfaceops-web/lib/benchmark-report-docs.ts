import fs from "node:fs";
import path from "node:path";
import { listGenerationBenchmarks, resolveBenchmarksDir } from "@/lib/generation-benchmarks";

export type BenchmarkReportSource = "artifact" | "archive";
export type BenchmarkAssessmentDimension = "structure" | "components" | "boundary" | "visual" | "responsiveness";
export type BenchmarkAssessmentGrade = "strong" | "partial" | "weak";

export interface BenchmarkReportListItem {
  id: string;
  source: BenchmarkReportSource;
  sourceLabel: "Run" | "Archive";
  sourceId: string;
  fileName: string;
  filePath: string;
  title: string;
  summary: string | null;
  dateLabel: string | null;
  generatedAt: string;
}

export interface BenchmarkReportVisualizationData {
  summary: {
    comparisonCount: number;
    meetsGoalCount: number;
    guidedReachedAcceptableNoLaterCount: number;
    guidedFewerFirstAttemptBlockingFindingsCount: number;
    guidedRubricAtLeastAsGoodCount: number;
  };
  rubric: Record<BenchmarkAssessmentDimension, {
    improved: number;
    same: number;
    regressed: number;
  }>;
  heuristics: {
    improvedCounts: BenchmarkHeuristicCounts;
    averageDelta: BenchmarkHeuristicAverageDelta;
  };
  comparisons: BenchmarkVisualizationComparison[];
}

export interface BenchmarkReportDocument extends BenchmarkReportListItem {
  markdown: string;
  visualization: BenchmarkReportVisualizationData | null;
}

export interface BenchmarkReportLookupOptions {
  archiveDir?: string;
  benchmarksDir?: string;
}

type BenchmarkHeuristicKey =
  | "unresolvedAcceptedSuggestionRate"
  | "noChangesAfterEditFailureCount"
  | "recoverableToolErrorCount"
  | "touchedFilesPerResolvedFinding"
  | "repeatedFindingCarryoverCount"
  | "rerunsToAcceptableOutcome";

interface BenchmarkHeuristicCounts {
  unresolvedAcceptedSuggestionRate: number;
  noChangesAfterEditFailureCount: number;
  recoverableToolErrorCount: number;
  touchedFilesPerResolvedFinding: number;
  repeatedFindingCarryoverCount: number;
  rerunsToAcceptableOutcome: number;
}

interface BenchmarkHeuristicAverageDelta {
  unresolvedAcceptedSuggestionRate: number | null;
  noChangesAfterEditFailureCount: number | null;
  recoverableToolErrorCount: number | null;
  touchedFilesPerResolvedFinding: number | null;
  repeatedFindingCarryoverCount: number | null;
  rerunsToAcceptableOutcome: number | null;
}

interface BenchmarkHeuristicDelta {
  unresolvedAcceptedSuggestionRate: number | null;
  noChangesAfterEditFailureCount: number;
  recoverableToolErrorCount: number;
  touchedFilesPerResolvedFinding: number | null;
  repeatedFindingCarryoverCount: number;
  rerunsToAcceptableOutcome: number | null;
}

interface BenchmarkVisualizationComparison {
  surfaceId: string;
  baselineGuidanceStrategy: string;
  guidedGuidanceStrategy: string;
  meetsGoal: boolean;
  guidedReachedAcceptableNoLater: boolean;
  guidedFewerFirstAttemptBlockingFindings: boolean;
  guidedRubricAtLeastAsGood: boolean;
  guidedRubricBetterDimensions: BenchmarkAssessmentDimension[];
  firstAttemptFindingCountDelta: number;
  firstAttemptBlockingFindingCountDelta: number;
  attemptsToAcceptableOutcomeDelta: number | null;
  rubric: Record<BenchmarkAssessmentDimension, {
    baseline: BenchmarkAssessmentGrade;
    guided: BenchmarkAssessmentGrade;
    delta: number;
  }>;
  heuristics: BenchmarkHeuristicDelta;
}

interface ArtifactBenchmarkReport {
  schemaVersion?: number;
  generatedAt: string;
  comparisons: Array<{
    comparisonPath: string;
    surfaceId: string;
    tool: string;
    meetsGoal: boolean;
    baselineGuidanceStrategy: string;
    guidedGuidanceStrategy: string;
    guidedFewerFirstAttemptBlockingFindings: boolean;
    guidedReachedAcceptableNoLater: boolean;
    guidedRubricBetterDimensions: BenchmarkAssessmentDimension[];
    heuristics?: Partial<BenchmarkHeuristicDelta>;
  }>;
  suggestions: Array<{
    suggestionsPath: string;
    surfaceId: string;
    sessionId: string;
    acceptedCount: number;
    rejectedCount: number;
    proposedCount: number;
  }>;
  overall: {
    surfaceCount: number;
    surfacesMeetingGoal: number;
    guidedFewerFirstAttemptBlockingFindings: number;
    guidedReachedAcceptableNoLater: number;
    acceptedSuggestionCount: number;
    rejectedSuggestionCount: number;
    proposedSuggestionCount: number;
    heuristics?: {
      lowerUnresolvedAcceptedSuggestionRate?: number;
      lowerNoChangesAfterEditFailureCount?: number;
      lowerRecoverableToolErrorCount?: number;
      lowerTouchedFilesPerResolvedFinding?: number;
      lowerRepeatedFindingCarryoverCount?: number;
      lowerRerunsToAcceptableOutcome?: number;
      averageDelta?: Partial<BenchmarkHeuristicAverageDelta>;
    };
  };
  visualization?: BenchmarkReportVisualizationData;
}

interface ComparisonArtifact {
  surfaceId: string;
  baseline: {
    guidanceStrategy: string;
  };
  guided: {
    guidanceStrategy: string;
  };
  delta: {
    firstAttemptFindingCountDelta: number;
    firstAttemptBlockingFindingCountDelta: number;
    attemptsToAcceptableOutcome: {
      delta: number | null;
    };
    rubric: BenchmarkVisualizationComparison["rubric"];
  };
  heuristics: {
    delta: BenchmarkHeuristicDelta;
  };
  checks: {
    guidedFewerFirstAttemptBlockingFindings: boolean;
    guidedReachedAcceptableNoLater: boolean;
    guidedRubricAtLeastAsGood: boolean;
    guidedRubricBetterDimensions: BenchmarkAssessmentDimension[];
    meetsGoal: boolean;
  };
}

const ASSESSMENT_DIMENSIONS: BenchmarkAssessmentDimension[] = [
  "structure",
  "components",
  "boundary",
  "visual",
  "responsiveness",
];

const BENCHMARK_HEURISTICS: Array<{ key: BenchmarkHeuristicKey }> = [
  { key: "unresolvedAcceptedSuggestionRate" },
  { key: "noChangesAfterEditFailureCount" },
  { key: "recoverableToolErrorCount" },
  { key: "touchedFilesPerResolvedFinding" },
  { key: "repeatedFindingCarryoverCount" },
  { key: "rerunsToAcceptableOutcome" },
];

function resolveRepoRoot(start = process.cwd()): string {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  throw new Error("Could not resolve the surfaces-webapps workspace root.");
}

export function resolveBenchmarkReportsDir(): string {
  if (process.env.SURFACEOPS_BENCHMARK_REPORTS_DIR?.trim()) {
    return path.resolve(process.env.SURFACEOPS_BENCHMARK_REPORTS_DIR);
  }
  return path.join(resolveRepoRoot(), "docs", "archive");
}

function normalizeOptions(input: BenchmarkReportLookupOptions = {}): Required<BenchmarkReportLookupOptions> {
  return {
    archiveDir: input.archiveDir ? path.resolve(input.archiveDir) : resolveBenchmarkReportsDir(),
    benchmarksDir: input.benchmarksDir ? path.resolve(input.benchmarksDir) : resolveBenchmarksDir(),
  };
}

function isArchiveBenchmarkReportFile(fileName: string): boolean {
  return fileName.endsWith(".md") && /benchmark/i.test(fileName);
}

function stripMarkdownDecorators(value: string): string {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function parseTitle(markdown: string, fallback: string): string {
  const line = markdown
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("# "));
  return stripMarkdownDecorators(line?.replace(/^#\s+/, "") ?? fallback);
}

function parseSummary(markdown: string): string | null {
  const paragraphs = markdown
    .split(/\r?\n\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    if (
      paragraph.startsWith("#") ||
      paragraph.startsWith("|") ||
      paragraph.startsWith("- ") ||
      paragraph.startsWith("* ") ||
      paragraph.startsWith("1. ") ||
      paragraph.startsWith("2. ") ||
      paragraph.startsWith("3. ")
    ) {
      continue;
    }
    return stripMarkdownDecorators(paragraph.replace(/\s+/g, " "));
  }

  return null;
}

function parseDateValue(fileName: string): string | null {
  const match = fileName.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0)).toISOString();
}

function formatDateLabel(dateValue: string | null): string | null {
  if (!dateValue) {
    return null;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateValue));
}

function countImproved(values: Array<number | null | undefined>): number {
  return values.reduce<number>(
    (total, value) => total + (typeof value === "number" && value < 0 ? 1 : 0),
    0,
  );
}

function averageNullable(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (filtered.length === 0) {
    return null;
  }
  return Math.round((filtered.reduce((sum, value) => sum + value, 0) / filtered.length) * 1000) / 1000;
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readComparisonArtifact(filePath: string): ComparisonArtifact | null {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return readJsonFile<ComparisonArtifact>(filePath);
}

function buildVisualizationFromComparisons(comparisons: ComparisonArtifact[]): BenchmarkReportVisualizationData | null {
  if (comparisons.length === 0) {
    return null;
  }

  const visualizationComparisons: BenchmarkVisualizationComparison[] = comparisons.map((comparison) => ({
    surfaceId: comparison.surfaceId,
    baselineGuidanceStrategy: comparison.baseline.guidanceStrategy,
    guidedGuidanceStrategy: comparison.guided.guidanceStrategy,
    meetsGoal: comparison.checks.meetsGoal,
    guidedReachedAcceptableNoLater: comparison.checks.guidedReachedAcceptableNoLater,
    guidedFewerFirstAttemptBlockingFindings: comparison.checks.guidedFewerFirstAttemptBlockingFindings,
    guidedRubricAtLeastAsGood: comparison.checks.guidedRubricAtLeastAsGood,
    guidedRubricBetterDimensions: comparison.checks.guidedRubricBetterDimensions,
    firstAttemptFindingCountDelta: comparison.delta.firstAttemptFindingCountDelta,
    firstAttemptBlockingFindingCountDelta: comparison.delta.firstAttemptBlockingFindingCountDelta,
    attemptsToAcceptableOutcomeDelta: comparison.delta.attemptsToAcceptableOutcome.delta,
    rubric: comparison.delta.rubric,
    heuristics: comparison.heuristics.delta,
  }));

  const rubric = Object.fromEntries(
    ASSESSMENT_DIMENSIONS.map((dimension) => {
      let improved = 0;
      let same = 0;
      let regressed = 0;
      for (const comparison of visualizationComparisons) {
        const delta = comparison.rubric[dimension].delta;
        if (delta > 0) {
          improved += 1;
        } else if (delta < 0) {
          regressed += 1;
        } else {
          same += 1;
        }
      }
      return [dimension, { improved, same, regressed }];
    }),
  ) as BenchmarkReportVisualizationData["rubric"];

  const heuristics = {
    improvedCounts: {
      unresolvedAcceptedSuggestionRate: countImproved(
        visualizationComparisons.map((comparison) => comparison.heuristics.unresolvedAcceptedSuggestionRate),
      ),
      noChangesAfterEditFailureCount: countImproved(
        visualizationComparisons.map((comparison) => comparison.heuristics.noChangesAfterEditFailureCount),
      ),
      recoverableToolErrorCount: countImproved(
        visualizationComparisons.map((comparison) => comparison.heuristics.recoverableToolErrorCount),
      ),
      touchedFilesPerResolvedFinding: countImproved(
        visualizationComparisons.map((comparison) => comparison.heuristics.touchedFilesPerResolvedFinding),
      ),
      repeatedFindingCarryoverCount: countImproved(
        visualizationComparisons.map((comparison) => comparison.heuristics.repeatedFindingCarryoverCount),
      ),
      rerunsToAcceptableOutcome: countImproved(
        visualizationComparisons.map((comparison) => comparison.heuristics.rerunsToAcceptableOutcome),
      ),
    },
    averageDelta: {
      unresolvedAcceptedSuggestionRate: averageNullable(
        visualizationComparisons.map((comparison) => comparison.heuristics.unresolvedAcceptedSuggestionRate),
      ),
      noChangesAfterEditFailureCount: averageNullable(
        visualizationComparisons.map((comparison) => comparison.heuristics.noChangesAfterEditFailureCount),
      ),
      recoverableToolErrorCount: averageNullable(
        visualizationComparisons.map((comparison) => comparison.heuristics.recoverableToolErrorCount),
      ),
      touchedFilesPerResolvedFinding: averageNullable(
        visualizationComparisons.map((comparison) => comparison.heuristics.touchedFilesPerResolvedFinding),
      ),
      repeatedFindingCarryoverCount: averageNullable(
        visualizationComparisons.map((comparison) => comparison.heuristics.repeatedFindingCarryoverCount),
      ),
      rerunsToAcceptableOutcome: averageNullable(
        visualizationComparisons.map((comparison) => comparison.heuristics.rerunsToAcceptableOutcome),
      ),
    },
  } satisfies BenchmarkReportVisualizationData["heuristics"];

  return {
    summary: {
      comparisonCount: visualizationComparisons.length,
      meetsGoalCount: visualizationComparisons.filter((comparison) => comparison.meetsGoal).length,
      guidedReachedAcceptableNoLaterCount: visualizationComparisons.filter(
        (comparison) => comparison.guidedReachedAcceptableNoLater,
      ).length,
      guidedFewerFirstAttemptBlockingFindingsCount: visualizationComparisons.filter(
        (comparison) => comparison.guidedFewerFirstAttemptBlockingFindings,
      ).length,
      guidedRubricAtLeastAsGoodCount: visualizationComparisons.filter(
        (comparison) => comparison.guidedRubricAtLeastAsGood,
      ).length,
    },
    rubric,
    heuristics,
    comparisons: visualizationComparisons,
  };
}

function resolveArtifactVisualization(report: ArtifactBenchmarkReport): BenchmarkReportVisualizationData | null {
  if (report.visualization) {
    return report.visualization;
  }

  const comparisons = report.comparisons
    .map((comparison) => readComparisonArtifact(comparison.comparisonPath))
    .filter((comparison): comparison is ComparisonArtifact => Boolean(comparison));

  return buildVisualizationFromComparisons(comparisons);
}

function buildArchiveReportDocument(fileName: string, archiveDir: string): BenchmarkReportDocument {
  const filePath = path.join(archiveDir, fileName);
  const markdown = fs.readFileSync(filePath, "utf8");
  const fallbackTitle = fileName.replace(/\.md$/, "");
  const generatedAt = parseDateValue(fileName) ?? new Date(fs.statSync(filePath).mtimeMs).toISOString();
  return {
    id: `archive-${fileName.replace(/\.md$/, "")}`,
    source: "archive",
    sourceLabel: "Archive",
    sourceId: fileName.replace(/\.md$/, ""),
    fileName,
    filePath,
    markdown,
    visualization: null,
    title: parseTitle(markdown, fallbackTitle),
    summary: parseSummary(markdown),
    dateLabel: formatDateLabel(generatedAt),
    generatedAt,
  };
}

function buildArtifactReportDocument(cohortId: string, benchmarksDir: string): BenchmarkReportDocument | null {
  const benchmarkRoot = path.join(benchmarksDir, cohortId);
  const markdownPath = path.join(benchmarkRoot, "report", "benchmark-report.md");
  const reportPath = path.join(benchmarkRoot, "report", "benchmark-report.json");
  if (!fs.existsSync(markdownPath) || !fs.existsSync(reportPath)) {
    return null;
  }

  const benchmark = listGenerationBenchmarks(benchmarksDir).find((entry) => entry.id === cohortId);
  if (!benchmark) {
    return null;
  }

  const markdown = fs.readFileSync(markdownPath, "utf8");
  const report = readJsonFile<ArtifactBenchmarkReport>(reportPath);
  const surfaceLabel = benchmark.surfaceIds.length > 0
    ? benchmark.surfaceIds.join(", ")
    : "unknown surfaces";
  const strategyLabel = benchmark.guidanceStrategies.length > 0
    ? benchmark.guidanceStrategies.join(" vs ")
    : "strategy comparison";

  return {
    id: `run-${cohortId}`,
    source: "artifact",
    sourceLabel: "Run",
    sourceId: cohortId,
    fileName: path.basename(markdownPath),
    filePath: markdownPath,
    markdown,
    visualization: resolveArtifactVisualization(report),
    title: benchmark.surfaceIds.length > 1
      ? `Benchmark Suite Run ${cohortId}`
      : `Benchmark Run ${cohortId}`,
    summary: `${surfaceLabel} · ${strategyLabel}`,
    dateLabel: formatDateLabel(benchmark.generatedAt),
    generatedAt: benchmark.generatedAt,
  };
}

function listArchiveReports(archiveDir: string): BenchmarkReportDocument[] {
  if (!fs.existsSync(archiveDir)) {
    return [];
  }

  return fs.readdirSync(archiveDir)
    .filter(isArchiveBenchmarkReportFile)
    .sort((left, right) => right.localeCompare(left))
    .map((fileName) => buildArchiveReportDocument(fileName, archiveDir));
}

function listArtifactReports(benchmarksDir: string): BenchmarkReportDocument[] {
  return listGenerationBenchmarks(benchmarksDir)
    .map((entry) => buildArtifactReportDocument(entry.id, benchmarksDir))
    .filter((entry): entry is BenchmarkReportDocument => Boolean(entry));
}

function sortReports(reports: BenchmarkReportDocument[]): BenchmarkReportDocument[] {
  return [...reports].sort((left, right) =>
    right.generatedAt.localeCompare(left.generatedAt)
    || left.source.localeCompare(right.source)
    || left.id.localeCompare(right.id));
}

export function listBenchmarkReports(options: BenchmarkReportLookupOptions = {}): BenchmarkReportListItem[] {
  const normalized = normalizeOptions(options);
  return sortReports([
    ...listArtifactReports(normalized.benchmarksDir),
    ...listArchiveReports(normalized.archiveDir),
  ]).map((entry) => ({
    id: entry.id,
    source: entry.source,
    sourceLabel: entry.sourceLabel,
    sourceId: entry.sourceId,
    fileName: entry.fileName,
    filePath: entry.filePath,
    title: entry.title,
    summary: entry.summary,
    dateLabel: entry.dateLabel,
    generatedAt: entry.generatedAt,
  }));
}

export function loadBenchmarkReport(
  reportId: string,
  options: BenchmarkReportLookupOptions = {},
): BenchmarkReportDocument | null {
  const normalized = normalizeOptions(options);

  if (reportId.startsWith("run-")) {
    return buildArtifactReportDocument(reportId.slice(4), normalized.benchmarksDir);
  }

  if (reportId.startsWith("archive-")) {
    const archiveId = reportId.slice("archive-".length);
    const fileName = `${archiveId}.md`;
    const filePath = path.join(normalized.archiveDir, fileName);
    if (!isArchiveBenchmarkReportFile(fileName) || !fs.existsSync(filePath)) {
      return null;
    }
    return buildArchiveReportDocument(fileName, normalized.archiveDir);
  }

  return loadBenchmarkReport(`archive-${reportId}`, normalized)
    ?? loadBenchmarkReport(`run-${reportId}`, normalized);
}
