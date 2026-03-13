import fs from "node:fs";
import path from "node:path";

export type AttemptView = "first" | "latest";

interface BenchmarkReport {
  generatedAt: string;
  comparisons: Array<{
    comparisonPath: string;
    surfaceId: string;
    tool: string;
    meetsGoal: boolean;
    guidedFewerFirstAttemptBlockingFindings: boolean;
    guidedReachedAcceptableNoLater: boolean;
    guidedRubricBetterDimensions: string[];
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
  };
}

interface PreviewRef {
  imagePath: string;
  metadataPath: string;
  url: string;
  finalUrl: string;
  capturedAt: string;
  waitFor?: string;
}

interface Assessment {
  structure: string;
  components: string;
  boundary: string;
  visual: string;
  responsiveness: string;
  notes: string;
  touchedFiles?: string[];
}

interface ComparisonAttemptSnapshot {
  attemptNumber: number;
  status: string;
  outcome: string;
  findingCount: number;
  blockingFindingCount: number;
  warningFindingCount: number;
  findingCodes: string[];
  assessment: Assessment;
  preview?: PreviewRef;
}

interface ComparisonSnapshot {
  sessionId: string;
  sessionDir: string;
  guidanceMode: string;
  attemptCount: number;
  firstAcceptableAttempt: number | null;
  latestOutcome: string;
  firstAttempt: ComparisonAttemptSnapshot;
  latestAttempt: ComparisonAttemptSnapshot;
  recurringFindingCodes: Array<{ code: string; count: number }>;
  recurringRepairCodes: Array<{
    code: string;
    count: number;
    priority: string;
    category: string;
    actionType: string;
  }>;
}

interface ComparisonArtifact {
  surfaceId: string;
  tool: string;
  brief: {
    sha256: string;
    baselinePath: string;
    guidedPath: string;
  };
  baseline: ComparisonSnapshot;
  guided: ComparisonSnapshot;
  delta: {
    firstAttemptVerdict: { baseline: string; guided: string };
    firstAttemptFindingCountDelta: number;
    firstAttemptBlockingFindingCountDelta: number;
    firstAttemptWarningFindingCountDelta: number;
    latestFindingCountDelta: number;
    attemptsToAcceptableOutcome: {
      baseline: number | null;
      guided: number | null;
      delta: number | null;
    };
    rubric: Record<string, { baseline: string; guided: string; delta: number }>;
  };
  checks: {
    guidedFewerFirstAttemptBlockingFindings: boolean;
    guidedReachedAcceptableNoLater: boolean;
    guidedRubricAtLeastAsGood: boolean;
    guidedRubricBetterDimensions: string[];
    meetsGoal: boolean;
  };
  paths: {
    baselineSessionDir: string;
    guidedSessionDir: string;
  };
}

interface SessionSummary {
  surfaceId: string;
  sessionId: string;
  tool: string;
  guidanceMode: string;
  attemptCount: number;
  firstPassAttempt: number | null;
  firstAcceptableAttempt: number | null;
  latestStatus: string;
  latestOutcome: string;
  latestAssessment: Assessment | null;
  latestReview: {
    status: string;
    rationale: string;
    findingCodes: string[];
  } | null;
  paths: {
    sessionPath: string;
    bundleRoot: string;
    preparedInputPath: string | null;
  };
  attempts: Array<{
    attemptNumber: number;
    status: string;
    outcome: string;
    findingCodes: string[];
    assessmentPath: string;
    metadataPath: string;
    reviewPath?: string;
    reviewStatus?: string;
    validatePath: string;
    createdAt?: string;
    preview?: PreviewRef;
  }>;
}

interface PreparedPayload {
  summary?: {
    text?: string;
    focusOrder?: string[];
    requiredSectionIds?: string[];
    checklist?: Array<{ id: string; label: string; detail: string }>;
    topRepairs?: Array<{
      code: string;
      priority: string;
      category: string;
      actionType: string;
    }>;
  };
  generation?: {
    guidance?: {
      boundaryRules?: Array<{
        id: string;
        shellOwns?: string[];
        mustNotEmit?: string[];
      }>;
    };
  };
}

interface SuggestionArtifact {
  suggestions: Array<{
    suggestionId: string;
    findingCode: string;
    status: string;
    confidence: number;
    findingMessage: string;
    repeatedFailureCount: number;
    proposedChange: {
      path: string;
      actionType: string;
      summary: string;
      valueHints: string[];
    };
    repair: {
      priority: string;
      category: string;
      actionType: string;
    };
    decision?: {
      rationale: string;
      decidedAt: string;
    };
  }>;
}

export interface BenchmarkListItem {
  id: string;
  rootDir: string;
  generatedAt: string;
  surfaceIds: string[];
  reportPath: string;
}

export interface GenerationWorkbenchData {
  benchmarksDir: string;
  benchmarkId: string;
  benchmarkDir: string;
  report: BenchmarkReport;
  surfaces: BenchmarkReport["comparisons"];
  selectedSurfaceId: string;
  attemptView: AttemptView;
  comparison: ComparisonArtifact;
  selectedAttemptSnapshots: {
    baseline: ComparisonAttemptSnapshot;
    guided: ComparisonAttemptSnapshot;
  };
  baselineSummary: SessionSummary;
  guidedSummary: SessionSummary;
  guidedPrepared: PreparedPayload | null;
  suggestions: SuggestionArtifact | null;
  briefText: string | null;
  previews: {
    baseline: { dataUrl: string | null; ref: PreviewRef | null };
    guided: { dataUrl: string | null; ref: PreviewRef | null };
  };
  timelines: {
    baseline: Array<{
      attemptNumber: number;
      status: string;
      outcome: string;
      findingCodes: string[];
      notes: string;
      touchedFiles: string[];
      reviewStatus?: string;
      reviewRationale?: string;
      preview?: PreviewRef;
    }>;
    guided: Array<{
      attemptNumber: number;
      status: string;
      outcome: string;
      findingCodes: string[];
      notes: string;
      touchedFiles: string[];
      reviewStatus?: string;
      reviewRationale?: string;
      preview?: PreviewRef;
    }>;
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readOptionalJson<T>(filePath: string | null | undefined): T | null {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return readJson<T>(filePath);
}

function readOptionalText(filePath: string | null | undefined): string | null {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, "utf8");
}

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

export function resolveBenchmarksDir(): string {
  if (process.env.SURFACEOPS_BENCHMARKS_DIR?.trim()) {
    return path.resolve(process.env.SURFACEOPS_BENCHMARKS_DIR);
  }
  return path.join(resolveRepoRoot(), "artifacts", "generation-benchmarks");
}

export function listGenerationBenchmarks(benchmarksDir = resolveBenchmarksDir()): BenchmarkListItem[] {
  if (!fs.existsSync(benchmarksDir)) {
    return [];
  }

  return fs.readdirSync(benchmarksDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const rootDir = path.join(benchmarksDir, entry.name);
      const reportPath = path.join(rootDir, "report", "benchmark-report.json");
      if (!fs.existsSync(reportPath)) {
        return null;
      }
      const report = readJson<BenchmarkReport>(reportPath);
      return {
        id: entry.name,
        rootDir,
        generatedAt: report.generatedAt,
        surfaceIds: report.comparisons.map((item) => item.surfaceId),
        reportPath,
      } satisfies BenchmarkListItem;
    })
    .filter((entry): entry is BenchmarkListItem => Boolean(entry))
    .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt) || left.id.localeCompare(right.id));
}

export function loadLatestBenchmarkId(benchmarksDir = resolveBenchmarksDir()): string | null {
  return listGenerationBenchmarks(benchmarksDir)[0]?.id ?? null;
}

function toPreviewDataUrl(preview: PreviewRef | null | undefined): string | null {
  if (!preview?.imagePath || !fs.existsSync(preview.imagePath)) {
    return null;
  }
  const bytes = fs.readFileSync(preview.imagePath);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

function buildTimeline(summary: SessionSummary): GenerationWorkbenchData["timelines"]["baseline"] {
  return summary.attempts.map((attempt) => {
    const assessment = readOptionalJson<Assessment>(attempt.assessmentPath);
    const review = readOptionalJson<{ rationale?: string }>(attempt.reviewPath);
    return {
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      outcome: attempt.outcome,
      findingCodes: attempt.findingCodes,
      notes: assessment?.notes ?? "No assessment notes recorded.",
      touchedFiles: assessment?.touchedFiles ?? [],
      ...(attempt.reviewStatus ? { reviewStatus: attempt.reviewStatus } : {}),
      ...(review?.rationale ? { reviewRationale: review.rationale } : {}),
      ...(attempt.preview ? { preview: attempt.preview } : {}),
    };
  });
}

export function loadGenerationWorkbench(input: {
  benchmarkId: string;
  surfaceId?: string | null;
  attemptView?: string | null;
  benchmarksDir?: string;
}): GenerationWorkbenchData {
  const benchmarksDir = input.benchmarksDir ? path.resolve(input.benchmarksDir) : resolveBenchmarksDir();
  const benchmarkDir = path.join(benchmarksDir, input.benchmarkId);
  const reportPath = path.join(benchmarkDir, "report", "benchmark-report.json");
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Benchmark report not found at ${reportPath}.`);
  }

  const report = readJson<BenchmarkReport>(reportPath);
  if (report.comparisons.length === 0) {
    throw new Error(`Benchmark ${input.benchmarkId} does not contain any comparisons.`);
  }

  const selectedSurfaceId = report.comparisons.some((item) => item.surfaceId === input.surfaceId)
    ? (input.surfaceId as string)
    : report.comparisons[0].surfaceId;
  const attemptView: AttemptView = input.attemptView === "first" ? "first" : "latest";
  const comparisonRecord = report.comparisons.find((item) => item.surfaceId === selectedSurfaceId);
  if (!comparisonRecord) {
    throw new Error(`Comparison for surface ${selectedSurfaceId} not found in benchmark ${input.benchmarkId}.`);
  }

  const comparison = readJson<ComparisonArtifact>(comparisonRecord.comparisonPath);
  const baselineSummaryPath = path.join(comparison.paths.baselineSessionDir, "summary.json");
  const guidedSummaryPath = path.join(comparison.paths.guidedSessionDir, "summary.json");
  const baselineSummary = readJson<SessionSummary>(baselineSummaryPath);
  const guidedSummary = readJson<SessionSummary>(guidedSummaryPath);
  const guidedPrepared = readOptionalJson<PreparedPayload>(guidedSummary.paths.preparedInputPath);
  const suggestions = readOptionalJson<SuggestionArtifact>(
    report.suggestions.find((item) => item.surfaceId === selectedSurfaceId)?.suggestionsPath,
  );
  const briefText = readOptionalText(comparison.brief.guidedPath) ?? readOptionalText(comparison.brief.baselinePath);
  const selectedAttemptSnapshots = {
    baseline: attemptView === "first" ? comparison.baseline.firstAttempt : comparison.baseline.latestAttempt,
    guided: attemptView === "first" ? comparison.guided.firstAttempt : comparison.guided.latestAttempt,
  };

  return {
    benchmarksDir,
    benchmarkId: input.benchmarkId,
    benchmarkDir,
    report,
    surfaces: report.comparisons,
    selectedSurfaceId,
    attemptView,
    comparison,
    selectedAttemptSnapshots,
    baselineSummary,
    guidedSummary,
    guidedPrepared,
    suggestions,
    briefText,
    previews: {
      baseline: {
        dataUrl: toPreviewDataUrl(selectedAttemptSnapshots.baseline.preview),
        ref: selectedAttemptSnapshots.baseline.preview ?? null,
      },
      guided: {
        dataUrl: toPreviewDataUrl(selectedAttemptSnapshots.guided.preview),
        ref: selectedAttemptSnapshots.guided.preview ?? null,
      },
    },
    timelines: {
      baseline: buildTimeline(baselineSummary),
      guided: buildTimeline(guidedSummary),
    },
  };
}
