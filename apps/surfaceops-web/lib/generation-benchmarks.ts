import fs from "node:fs";
import path from "node:path";

export type AttemptView = "first" | "latest";

export interface BenchmarkComparisonPair {
  baselineGuidanceStrategy: string;
  guidedGuidanceStrategy: string;
}

export interface BenchmarkSpecFixture {
  fixtureId: string;
  surfaceId: string;
  brief: {
    path: string;
    sha256: string;
  };
  platformTarget: "web" | "ios" | "android";
  consumerType: "web-browser" | "desktop-shell" | "ios-native" | "android-native";
  capturePreset: string;
  comparisonPairs: BenchmarkComparisonPair[];
  paths?: {
    fixtureDir?: string;
    sourceContractPath?: string;
    sourceAstPath?: string;
    bundleRoot?: string;
    compiledContractPath?: string;
    effectiveAstPath?: string;
    preparedInputPath?: string;
    acceptedSuggestionsPath?: string;
    designerNotesPath?: string;
    baselineValidatePath?: string;
  };
}

export interface BenchmarkSpecManifest {
  schemaVersion: 1;
  specId: string;
  generatedAt: string;
  evaluationMode: "zero-shot" | "iterative";
  attemptBudget: number;
  guidanceStrategies: string[];
  comparisonPairs: BenchmarkComparisonPair[];
  suiteId?: string;
  suiteName?: string;
  fixtures: BenchmarkSpecFixture[];
}

export interface BenchmarkRunManifestFixture extends BenchmarkSpecFixture {
  sessions: Array<{
    guidanceStrategy: string;
    sessionId: string;
    sessionDir: string;
    transcriptPath: string;
    guidanceHandoffPath: string;
    agentInputPath: string;
    explainabilityPath: string;
    summaryPath: string;
    previewPath: string | null;
  }>;
  comparisons: Array<{
    baselineGuidanceStrategy: string;
    guidedGuidanceStrategy: string;
    comparisonDir: string;
    comparisonPath: string;
  }>;
}

export interface BenchmarkRunManifest {
  schemaVersion: 1;
  cohortId: string;
  generatedAt: string;
  evaluationMode: "zero-shot" | "iterative";
  tool: string;
  sourceSpecPath: string;
  sourceRunPath: string | null;
  attemptBudget: number;
  guidanceStrategies: string[];
  comparisonPairs: BenchmarkComparisonPair[];
  suiteId?: string;
  suiteName?: string;
  model: {
    requestedModelLabel: string | null;
    resolvedModelId: string | null;
    baseUrl: string | null;
    fingerprint: string | null;
  };
  paths: {
    benchmarkDir: string;
    specPath: string;
    runPath: string;
    reportJsonPath: string | null;
    reportMarkdownPath: string | null;
  };
  fixtures: BenchmarkRunManifestFixture[];
}

interface LegacyBenchmarkCohortManifestFixture {
  fixtureId: string;
  profileId: string;
  profileName: string;
  surfaceId: string;
  tool: string;
  comparisonPairs: Array<{
    baselineGuidanceStrategy: string;
    guidedGuidanceStrategy: string;
  }>;
  brief: {
    path: string;
    sha256: string;
  };
  paths: {
    fixtureDir: string;
    sourceContractPath?: string;
    sourceAstPath?: string;
    bundleRoot?: string;
    compiledContractPath?: string;
    effectiveAstPath: string;
    preparedInputPath: string;
    acceptedSuggestionsPath: string;
    designerNotesPath: string;
    baselineValidatePath: string;
  };
  sessions: Array<{
    guidanceStrategy: string;
    sessionId: string;
    sessionDir: string;
    transcriptPath: string;
    guidanceHandoffPath: string;
    agentInputPath: string;
    explainabilityPath: string;
    summaryPath: string;
    previewPath: string | null;
  }>;
  comparisons: Array<{
    baselineGuidanceStrategy: string;
    guidedGuidanceStrategy: string;
    comparisonDir: string;
    comparisonPath: string;
  }>;
}

interface LegacyBenchmarkCohortManifest {
  schemaVersion: 1 | 2;
  cohortId: string;
  generatedAt: string;
  tool: string;
  guidanceStrategies: string[];
  suiteId?: string;
  suiteName?: string;
  profileId?: string;
  profileName?: string;
  surfaceId?: string;
  comparisonPairs?: Array<{
    baselineGuidanceStrategy: string;
    guidedGuidanceStrategy: string;
  }>;
  brief?: {
    path: string;
    sha256: string;
  };
  model: {
    baseUrl: string;
    model: string;
    fingerprint: string;
  };
  paths: {
    benchmarkDir: string;
    effectiveAstPath?: string;
    preparedInputPath?: string;
    reportJsonPath: string;
    reportMarkdownPath: string;
  };
  sessions?: Array<{
    guidanceStrategy: string;
    sessionId: string;
    sessionDir: string;
    transcriptPath: string;
    guidanceHandoffPath: string;
    agentInputPath: string;
    explainabilityPath: string;
    summaryPath: string;
    previewPath: string | null;
  }>;
  comparisons?: Array<{
    baselineGuidanceStrategy: string;
    guidedGuidanceStrategy: string;
    comparisonDir: string;
    comparisonPath: string;
  }>;
  fixtures?: LegacyBenchmarkCohortManifestFixture[];
}

export type BenchmarkManifest = BenchmarkRunManifest | LegacyBenchmarkCohortManifest;

interface BenchmarkReport {
  generatedAt: string;
  run?: {
    cohortId: string;
    evaluationMode: "zero-shot" | "iterative";
    tool: string;
    sourceSpecPath: string;
    sourceRunPath: string | null;
    guidanceStrategies: string[];
    attemptBudget: number;
    model: {
      requestedModelLabel: string | null;
      resolvedModelId: string | null;
      baseUrl: string | null;
      fingerprint: string | null;
    };
  };
  comparisons: Array<{
    comparisonPath: string;
    surfaceId: string;
    tool: string;
    meetsGoal: boolean;
    baselineGuidanceStrategy: string;
    guidedGuidanceStrategy: string;
    platformTarget?: string;
    consumerType?: string;
    modelLabel?: string | null;
    guidedFewerFirstAttemptBlockingFindings: boolean;
    guidedReachedAcceptableNoLater: boolean;
    guidedRubricBetterDimensions: string[];
    heuristics?: {
      unresolvedAcceptedSuggestionRate?: number | null;
      noChangesAfterEditFailureCount?: number;
      recoverableToolErrorCount?: number;
      touchedFilesPerResolvedFinding?: number | null;
      repeatedFindingCarryoverCount?: number;
      rerunsToAcceptableOutcome?: number | null;
    };
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
  breakdowns?: {
    byPlatformTarget: Record<string, {
      comparisonCount: number;
      surfaceCount: number;
      surfacesMeetingGoal: number;
      guidedFewerFirstAttemptBlockingFindings: number;
      guidedReachedAcceptableNoLater: number;
    }>;
    byConsumerType: Record<string, {
      comparisonCount: number;
      surfaceCount: number;
      surfacesMeetingGoal: number;
      guidedFewerFirstAttemptBlockingFindings: number;
      guidedReachedAcceptableNoLater: number;
    }>;
    byModelLabel: Record<string, {
      comparisonCount: number;
      surfaceCount: number;
      surfacesMeetingGoal: number;
      guidedFewerFirstAttemptBlockingFindings: number;
      guidedReachedAcceptableNoLater: number;
    }>;
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
  platformFit?: string;
  notes: string;
  touchedFiles?: string[];
  heuristics?: {
    unresolvedAcceptedSuggestionCount?: number;
    unresolvedAcceptedSuggestionRate?: number | null;
    noChangesAfterEditFailureCount?: number;
    recoverableToolErrorCount?: number;
    touchedFilesPerResolvedFinding?: number | null;
  };
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
  guidanceStrategy: string;
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
  heuristics?: {
    latestAttempt?: Assessment["heuristics"];
    repeatedFindingCarryoverCount?: number;
    rerunsToAcceptableOutcome?: number | null;
  };
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
  heuristics?: {
    baseline?: ComparisonSnapshot["heuristics"];
    guided?: ComparisonSnapshot["heuristics"];
    delta?: BenchmarkReport["comparisons"][number]["heuristics"];
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
  guidanceStrategy: string;
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
  heuristics?: {
    latestAttempt?: Assessment["heuristics"];
    repeatedFindingCarryoverCount?: number;
    rerunsToAcceptableOutcome?: number | null;
  };
  paths: {
    sessionPath: string;
    bundleRoot: string;
    preparedInputPath: string | null;
    guidanceHandoffPath?: string | null;
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
  profileName: string | null;
  guidanceStrategies: string[];
  requestedModelLabel: string | null;
  resolvedModelId: string | null;
  modelFingerprint: string | null;
  platformTargets: string[];
  consumerTypes: string[];
}

export interface GenerationWorkbenchData {
  benchmarksDir: string;
  benchmarkId: string;
  benchmarkDir: string;
  manifest: BenchmarkManifest | null;
  report: BenchmarkReport;
  surfaces: BenchmarkReport["comparisons"];
  selectedSurfaceId: string;
  attemptView: AttemptView;
  comparison: ComparisonArtifact;
  comparisonLabels: {
    baseline: string;
    guided: string;
  };
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

export function loadBenchmarkManifest(rootDir: string): BenchmarkManifest | null {
  return (
    readOptionalJson<BenchmarkRunManifest>(path.join(rootDir, "run.json"))
    ?? readOptionalJson<LegacyBenchmarkCohortManifest>(path.join(rootDir, "manifest.json"))
  );
}

function manifestModelInfo(manifest: BenchmarkManifest | null): {
  requestedModelLabel: string | null;
  resolvedModelId: string | null;
  fingerprint: string | null;
} {
  if (!manifest?.model) {
    return {
      requestedModelLabel: null,
      resolvedModelId: null,
      fingerprint: null,
    };
  }
  if ("requestedModelLabel" in manifest.model) {
    return {
      requestedModelLabel: manifest.model.requestedModelLabel ?? null,
      resolvedModelId: manifest.model.resolvedModelId ?? null,
      fingerprint: manifest.model.fingerprint ?? null,
    };
  }
  return {
    requestedModelLabel: manifest.model.model ?? null,
    resolvedModelId: manifest.model.model ?? null,
    fingerprint: manifest.model.fingerprint ?? null,
  };
}

function manifestFixtures(manifest: BenchmarkManifest | null): Array<{ surfaceId: string; platformTarget?: string; consumerType?: string }> {
  if (!manifest?.fixtures?.length) {
    return [];
  }
  return manifest.fixtures.map((fixture) => ({
    surfaceId: fixture.surfaceId,
    ...(typeof (fixture as BenchmarkSpecFixture).platformTarget === "string"
      ? { platformTarget: (fixture as BenchmarkSpecFixture).platformTarget }
      : {}),
    ...(typeof (fixture as BenchmarkSpecFixture).consumerType === "string"
      ? { consumerType: (fixture as BenchmarkSpecFixture).consumerType }
      : {}),
  }));
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
      const manifest = loadBenchmarkManifest(rootDir);
      const guidanceStrategies = manifest?.guidanceStrategies?.length
        ? manifest.guidanceStrategies
        : [...new Set(report.comparisons.flatMap((item) => [
          item.baselineGuidanceStrategy,
          item.guidedGuidanceStrategy,
        ].filter(Boolean)))];
      const fixtureMetadata = manifestFixtures(manifest);
      const model = manifestModelInfo(manifest);
      const manifestSurfaceIds = fixtureMetadata.length > 0
        ? fixtureMetadata.map((fixture) => fixture.surfaceId)
        : "surfaceId" in (manifest ?? {}) && typeof (manifest as LegacyBenchmarkCohortManifest).surfaceId === "string"
          ? [(manifest as LegacyBenchmarkCohortManifest).surfaceId as string]
          : [];
      const requestedModelLabel = model.requestedModelLabel ?? report.run?.model.requestedModelLabel ?? null;
      const resolvedModelId = model.resolvedModelId ?? report.run?.model.resolvedModelId ?? null;
      return {
        id: entry.name,
        rootDir,
        generatedAt: report.generatedAt,
        surfaceIds: manifestSurfaceIds.length > 0
          ? manifestSurfaceIds
          : report.comparisons.map((item) => item.surfaceId),
        reportPath,
        profileName: ("suiteName" in (manifest ?? {}) ? (manifest as BenchmarkRunManifest | LegacyBenchmarkCohortManifest).suiteName : null)
          ?? ("profileName" in (manifest ?? {}) ? (manifest as LegacyBenchmarkCohortManifest).profileName ?? null : null),
        guidanceStrategies,
        requestedModelLabel,
        resolvedModelId,
        modelFingerprint: model.fingerprint ?? report.run?.model.fingerprint ?? null,
        platformTargets: [...new Set(fixtureMetadata.map((fixture) => fixture.platformTarget).filter(Boolean) as string[])],
        consumerTypes: [...new Set(fixtureMetadata.map((fixture) => fixture.consumerType).filter(Boolean) as string[])],
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
  return loadGenerationWorkbenchFromRoot({
    benchmarkDir,
    benchmarkId: input.benchmarkId,
    benchmarksDir,
    surfaceId: input.surfaceId,
    attemptView: input.attemptView,
  });
}

export function loadGenerationWorkbenchFromRoot(input: {
  benchmarkDir: string;
  benchmarkId: string;
  benchmarksDir?: string;
  surfaceId?: string | null;
  attemptView?: string | null;
}): GenerationWorkbenchData {
  const benchmarksDir = input.benchmarksDir ? path.resolve(input.benchmarksDir) : path.dirname(input.benchmarkDir);
  const benchmarkDir = path.resolve(input.benchmarkDir);
  const manifest = loadBenchmarkManifest(benchmarkDir);
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
    manifest,
    report,
    surfaces: report.comparisons,
    selectedSurfaceId,
    attemptView,
    comparison,
    comparisonLabels: {
      baseline: comparison.baseline.guidanceStrategy,
      guided: comparison.guided.guidanceStrategy,
    },
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
