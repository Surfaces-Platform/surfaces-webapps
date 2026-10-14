import fs from "node:fs";
import path from "node:path";
import type { BenchmarkRunManifest } from "@/lib/generation-benchmarks";
import { listGenerationBenchmarks, loadBenchmarkManifest, resolveBenchmarksDir } from "@/lib/generation-benchmarks";

export type BenchmarkReportSource = "artifact" | "archive";
export type BenchmarkAssessmentDimension =
  | "structure"
  | "components"
  | "boundary"
  | "visual"
  | "responsiveness"
  | "platformFit";
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
  evidence: BenchmarkReportRunEvidence | null;
}

export interface BenchmarkReportArtifactText {
  label: string;
  path: string;
  language: "json" | "markdown" | "text";
  text: string | null;
}

export interface BenchmarkReportPreviewEvidence {
  imagePath: string;
  dataUrl: string | null;
  url: string | null;
  finalUrl: string | null;
  capturedAt: string | null;
  waitFor: string | null;
}

export interface BenchmarkReportSessionEvidence {
  guidanceStrategy: string;
  sessionId: string;
  latestStatus: string | null;
  latestOutcome: string | null;
  errorMessage: string | null;
  summaryPath: string;
  guidanceHandoffPath: string;
  guidanceHandoffText: string | null;
  agentInputPath: string;
  agentInputText: string | null;
  preview: BenchmarkReportPreviewEvidence | null;
}

export interface BenchmarkReportFixtureEvidence {
  fixtureId: string;
  surfaceId: string;
  platformTarget: "web" | "ios" | "android";
  consumerType: "web-browser" | "desktop-shell" | "ios-native" | "android-native";
  capturePreset: string;
  brief: {
    path: string;
    sha256: string;
    text: string | null;
  };
  contracts: BenchmarkReportArtifactText[];
  inputs: BenchmarkReportArtifactText[];
  sessions: BenchmarkReportSessionEvidence[];
  comparisons: Array<{
    baselineGuidanceStrategy: string;
    guidedGuidanceStrategy: string;
    comparisonPath: string;
  }>;
}

export interface BenchmarkReportRunEvidence {
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
  fixtures: BenchmarkReportFixtureEvidence[];
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

interface EvidenceSessionSummary {
  latestStatus?: string;
  latestOutcome?: string;
  firstAcceptableAttempt?: number | null;
  attempts?: Array<{
    status?: string;
    outcome?: string;
    findingCodes?: string[];
  }>;
  latestAssessment?: Partial<Record<BenchmarkAssessmentDimension, BenchmarkAssessmentGrade>>;
  heuristics?: {
    latestAttempt?: Partial<Record<BenchmarkHeuristicKey, number | null>>;
    repeatedFindingCarryoverCount?: number;
    rerunsToAcceptableOutcome?: number | null;
  };
}

const ASSESSMENT_DIMENSIONS: BenchmarkAssessmentDimension[] = [
  "structure",
  "components",
  "boundary",
  "visual",
  "responsiveness",
  "platformFit",
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

function readOptionalJsonFile<T>(filePath: string | null | undefined): T | null {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return readJsonFile<T>(filePath);
}

function readOptionalTextFile(filePath: string | null | undefined): string | null {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, "utf8").trim();
}

function inferArtifactLanguage(filePath: string): BenchmarkReportArtifactText["language"] {
  if (filePath.endsWith(".json")) {
    return "json";
  }
  if (filePath.endsWith(".md")) {
    return "markdown";
  }
  return "text";
}

function buildArtifactText(label: string, filePath: string | null | undefined): BenchmarkReportArtifactText | null {
  if (!filePath) {
    return null;
  }
  return {
    label,
    path: filePath,
    language: inferArtifactLanguage(filePath),
    text: readOptionalTextFile(filePath),
  };
}

function toPreviewDataUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath || !fs.existsSync(imagePath)) {
    return null;
  }
  return `data:image/png;base64,${fs.readFileSync(imagePath).toString("base64")}`;
}

function buildPreviewEvidence(
  summary: { attempts?: Array<{ preview?: {
    imagePath?: string;
    url?: string;
    finalUrl?: string;
    capturedAt?: string;
    waitFor?: string;
  } }> } | null,
  fallbackImagePath: string | null,
): BenchmarkReportPreviewEvidence | null {
  const preview = summary?.attempts
    ?.slice()
    .reverse()
    .find((attempt) => attempt.preview)?.preview;
  const imagePath = preview?.imagePath ?? fallbackImagePath;
  if (!imagePath) {
    return null;
  }
  return {
    imagePath,
    dataUrl: toPreviewDataUrl(imagePath),
    url: preview?.url ?? null,
    finalUrl: preview?.finalUrl ?? null,
    capturedAt: preview?.capturedAt ?? null,
    waitFor: preview?.waitFor ?? null,
  };
}

function buildRunEvidence(benchmarkRoot: string): BenchmarkReportRunEvidence | null {
  const manifest = loadBenchmarkManifest(benchmarkRoot);
  if (!manifest?.model || !("requestedModelLabel" in manifest.model)) {
    return null;
  }
  const run = manifest as BenchmarkRunManifest;

  return {
    cohortId: run.cohortId,
    evaluationMode: run.evaluationMode,
    tool: run.tool,
    sourceSpecPath: run.sourceSpecPath,
    sourceRunPath: run.sourceRunPath,
    guidanceStrategies: [...run.guidanceStrategies],
    attemptBudget: run.attemptBudget,
    model: { ...run.model },
    fixtures: run.fixtures.map((fixture) => {
      const summaryByStrategy = new Map(
        fixture.sessions.map((session) => [
          session.guidanceStrategy,
          readOptionalJsonFile<{
            latestStatus?: string;
            latestOutcome?: string;
            errorMessage?: string;
            attempts?: Array<{ preview?: {
              imagePath?: string;
              url?: string;
              finalUrl?: string;
              capturedAt?: string;
              waitFor?: string;
            } }>;
          }>(session.summaryPath),
        ] as const),
      );

      return {
        fixtureId: fixture.fixtureId,
        surfaceId: fixture.surfaceId,
        platformTarget: fixture.platformTarget,
        consumerType: fixture.consumerType,
        capturePreset: fixture.capturePreset,
        brief: {
          path: fixture.brief.path,
          sha256: fixture.brief.sha256,
          text: readOptionalTextFile(fixture.brief.path),
        },
        contracts: [
          buildArtifactText("Source contract", fixture.paths?.sourceContractPath),
          buildArtifactText("Source AST", fixture.paths?.sourceAstPath),
          buildArtifactText("Effective AST", fixture.paths?.effectiveAstPath),
          buildArtifactText("Compiled contract", fixture.paths?.compiledContractPath),
        ].filter((entry): entry is BenchmarkReportArtifactText => Boolean(entry)),
        inputs: [
          buildArtifactText("Prepared input", fixture.paths?.preparedInputPath),
          buildArtifactText("Accepted suggestions", fixture.paths?.acceptedSuggestionsPath),
          buildArtifactText("Designer notes", fixture.paths?.designerNotesPath),
          buildArtifactText("Baseline validate", fixture.paths?.baselineValidatePath),
        ].filter((entry): entry is BenchmarkReportArtifactText => Boolean(entry)),
        sessions: fixture.sessions.map((session) => {
          const summary = summaryByStrategy.get(session.guidanceStrategy) ?? null;
          return {
            guidanceStrategy: session.guidanceStrategy,
            sessionId: session.sessionId,
            latestStatus: summary?.latestStatus ?? null,
            latestOutcome: summary?.latestOutcome ?? null,
            errorMessage: typeof summary?.errorMessage === "string" ? summary.errorMessage : null,
            summaryPath: session.summaryPath,
            guidanceHandoffPath: session.guidanceHandoffPath,
            guidanceHandoffText: readOptionalTextFile(session.guidanceHandoffPath),
            agentInputPath: session.agentInputPath,
            agentInputText: readOptionalTextFile(session.agentInputPath),
            preview: buildPreviewEvidence(summary, session.previewPath),
          };
        }),
        comparisons: fixture.comparisons.map((comparison) => ({
          baselineGuidanceStrategy: comparison.baselineGuidanceStrategy,
          guidedGuidanceStrategy: comparison.guidedGuidanceStrategy,
          comparisonPath: comparison.comparisonPath,
        })),
      };
    }),
  };
}

function isNonBlockingStatus(status: string | null | undefined): boolean {
  return status === "pass" || status === "warn";
}

function gradeValue(grade: BenchmarkAssessmentGrade): number {
  switch (grade) {
    case "strong":
      return 2;
    case "partial":
      return 1;
    default:
      return 0;
  }
}

function coerceAssessmentGrade(value: unknown): BenchmarkAssessmentGrade {
  return value === "strong" || value === "partial" || value === "weak" ? value : "weak";
}

function readEvidenceSessionSummary(session: BenchmarkReportSessionEvidence): EvidenceSessionSummary | null {
  return readOptionalJsonFile<EvidenceSessionSummary>(session.summaryPath);
}

function resolveFirstAttemptFindingCount(summary: EvidenceSessionSummary | null): number {
  const attempt = Array.isArray(summary?.attempts) ? summary.attempts[0] : null;
  if (attempt) {
    return Array.isArray(attempt.findingCodes) ? attempt.findingCodes.length : 0;
  }
  return summary?.latestStatus === "block" ? 1 : 0;
}

function resolveFirstAttemptBlockingFindingCount(summary: EvidenceSessionSummary | null): number {
  const attempt = Array.isArray(summary?.attempts) ? summary.attempts[0] : null;
  if (attempt?.status === "block") {
    return Array.isArray(attempt.findingCodes) && attempt.findingCodes.length > 0 ? attempt.findingCodes.length : 1;
  }
  return summary?.latestStatus === "block" ? 1 : 0;
}

function resolveFirstAcceptableAttempt(summary: EvidenceSessionSummary | null): number | null {
  if (typeof summary?.firstAcceptableAttempt === "number" && Number.isFinite(summary.firstAcceptableAttempt)) {
    return summary.firstAcceptableAttempt;
  }
  if (isNonBlockingStatus(summary?.latestStatus ?? null)) {
    return Array.isArray(summary?.attempts) && summary.attempts.length > 0 ? summary.attempts.length : 1;
  }
  return null;
}

function resolveHeuristicValue(
  summary: EvidenceSessionSummary | null,
  key: BenchmarkHeuristicKey,
): number | null {
  if (key === "repeatedFindingCarryoverCount") {
    return typeof summary?.heuristics?.repeatedFindingCarryoverCount === "number"
      ? summary.heuristics.repeatedFindingCarryoverCount
      : 0;
  }
  if (key === "rerunsToAcceptableOutcome") {
    return typeof summary?.heuristics?.rerunsToAcceptableOutcome === "number"
      ? summary.heuristics.rerunsToAcceptableOutcome
      : null;
  }
  const value = summary?.heuristics?.latestAttempt?.[key];
  return typeof value === "number" ? value : null;
}

function deriveVisualizationComparisonFromSessions(input: {
  surfaceId: string;
  baselineGuidanceStrategy: string;
  guidedGuidanceStrategy: string;
  baselineSession: BenchmarkReportSessionEvidence;
  guidedSession: BenchmarkReportSessionEvidence;
}): BenchmarkVisualizationComparison {
  const baselineSummary = readEvidenceSessionSummary(input.baselineSession);
  const guidedSummary = readEvidenceSessionSummary(input.guidedSession);

  const rubric = Object.fromEntries(
    ASSESSMENT_DIMENSIONS.map((dimension) => {
      const baseline = coerceAssessmentGrade(baselineSummary?.latestAssessment?.[dimension]);
      const guided = coerceAssessmentGrade(guidedSummary?.latestAssessment?.[dimension]);
      return [dimension, {
        baseline,
        guided,
        delta: gradeValue(guided) - gradeValue(baseline),
      }];
    }),
  ) as BenchmarkVisualizationComparison["rubric"];

  const firstAttemptFindingCountDelta =
    resolveFirstAttemptFindingCount(guidedSummary) - resolveFirstAttemptFindingCount(baselineSummary);
  const firstAttemptBlockingFindingCountDelta =
    resolveFirstAttemptBlockingFindingCount(guidedSummary) - resolveFirstAttemptBlockingFindingCount(baselineSummary);
  const baselineAcceptableAttempt = resolveFirstAcceptableAttempt(baselineSummary);
  const guidedAcceptableAttempt = resolveFirstAcceptableAttempt(guidedSummary);

  const heuristics: BenchmarkHeuristicDelta = {
    unresolvedAcceptedSuggestionRate: (() => {
      const baseline = resolveHeuristicValue(baselineSummary, "unresolvedAcceptedSuggestionRate");
      const guided = resolveHeuristicValue(guidedSummary, "unresolvedAcceptedSuggestionRate");
      return baseline === null || guided === null ? null : guided - baseline;
    })(),
    noChangesAfterEditFailureCount: (() => {
      const baseline = resolveHeuristicValue(baselineSummary, "noChangesAfterEditFailureCount") ?? 0;
      const guided = resolveHeuristicValue(guidedSummary, "noChangesAfterEditFailureCount") ?? 0;
      return guided - baseline;
    })(),
    recoverableToolErrorCount: (() => {
      const baseline = resolveHeuristicValue(baselineSummary, "recoverableToolErrorCount") ?? 0;
      const guided = resolveHeuristicValue(guidedSummary, "recoverableToolErrorCount") ?? 0;
      return guided - baseline;
    })(),
    touchedFilesPerResolvedFinding: (() => {
      const baseline = resolveHeuristicValue(baselineSummary, "touchedFilesPerResolvedFinding");
      const guided = resolveHeuristicValue(guidedSummary, "touchedFilesPerResolvedFinding");
      return baseline === null || guided === null ? null : guided - baseline;
    })(),
    repeatedFindingCarryoverCount: (() => {
      const baseline = resolveHeuristicValue(baselineSummary, "repeatedFindingCarryoverCount") ?? 0;
      const guided = resolveHeuristicValue(guidedSummary, "repeatedFindingCarryoverCount") ?? 0;
      return guided - baseline;
    })(),
    rerunsToAcceptableOutcome: (() => {
      const baseline = resolveHeuristicValue(baselineSummary, "rerunsToAcceptableOutcome");
      const guided = resolveHeuristicValue(guidedSummary, "rerunsToAcceptableOutcome");
      return baseline === null || guided === null ? null : guided - baseline;
    })(),
  };

  const guidedRubricBetterDimensions = ASSESSMENT_DIMENSIONS.filter((dimension) => rubric[dimension].delta > 0);

  return {
    surfaceId: input.surfaceId,
    baselineGuidanceStrategy: input.baselineGuidanceStrategy,
    guidedGuidanceStrategy: input.guidedGuidanceStrategy,
    meetsGoal: guidedSummary?.latestStatus === "pass",
    guidedReachedAcceptableNoLater: guidedAcceptableAttempt !== null
      && (baselineAcceptableAttempt === null || guidedAcceptableAttempt <= baselineAcceptableAttempt),
    guidedFewerFirstAttemptBlockingFindings: firstAttemptBlockingFindingCountDelta < 0,
    guidedRubricAtLeastAsGood: ASSESSMENT_DIMENSIONS.every((dimension) => rubric[dimension].delta >= 0),
    guidedRubricBetterDimensions,
    firstAttemptFindingCountDelta,
    firstAttemptBlockingFindingCountDelta,
    attemptsToAcceptableOutcomeDelta:
      baselineAcceptableAttempt !== null && guidedAcceptableAttempt !== null
        ? guidedAcceptableAttempt - baselineAcceptableAttempt
        : null,
    rubric,
    heuristics,
  };
}

function buildVisualizationFromVisualizationComparisons(
  visualizationComparisons: BenchmarkVisualizationComparison[],
): BenchmarkReportVisualizationData | null {
  if (visualizationComparisons.length === 0) {
    return null;
  }

  const rubric = Object.fromEntries(
    ASSESSMENT_DIMENSIONS.map((dimension) => {
      let improved = 0;
      let same = 0;
      let regressed = 0;
      for (const comparison of visualizationComparisons) {
        const delta = comparison.rubric[dimension]?.delta ?? 0;
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

function buildVisualizationFromRunEvidence(evidence: BenchmarkReportRunEvidence | null): BenchmarkReportVisualizationData | null {
  if (!evidence) {
    return null;
  }

  const visualizationComparisons: BenchmarkVisualizationComparison[] = [];
  for (const fixture of evidence.fixtures) {
    const sessionsByStrategy = new Map(fixture.sessions.map((session) => [session.guidanceStrategy, session]));
    const candidatePairs = fixture.comparisons.length > 0
      ? fixture.comparisons.map((comparison) => ({
          baselineGuidanceStrategy: comparison.baselineGuidanceStrategy,
          guidedGuidanceStrategy: comparison.guidedGuidanceStrategy,
        }))
      : [
          { baselineGuidanceStrategy: "unguided", guidedGuidanceStrategy: "baseline-primary" },
          { baselineGuidanceStrategy: "unguided", guidedGuidanceStrategy: "json-primary" },
          { baselineGuidanceStrategy: "baseline-primary", guidedGuidanceStrategy: "json-primary" },
          { baselineGuidanceStrategy: "prompt-summary", guidedGuidanceStrategy: "baseline-primary" },
          { baselineGuidanceStrategy: "prompt-summary", guidedGuidanceStrategy: "json-primary" },
        ];

    for (const pair of candidatePairs) {
      const baselineSession = sessionsByStrategy.get(pair.baselineGuidanceStrategy);
      const guidedSession = sessionsByStrategy.get(pair.guidedGuidanceStrategy);
      if (!baselineSession || !guidedSession) {
        continue;
      }
      visualizationComparisons.push(deriveVisualizationComparisonFromSessions({
        surfaceId: fixture.surfaceId,
        baselineGuidanceStrategy: pair.baselineGuidanceStrategy,
        guidedGuidanceStrategy: pair.guidedGuidanceStrategy,
        baselineSession,
        guidedSession,
      }));
    }
  }

  return buildVisualizationFromVisualizationComparisons(visualizationComparisons);
}

function readComparisonArtifact(filePath: string): ComparisonArtifact | null {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return readJsonFile<ComparisonArtifact>(filePath);
}

function buildVisualizationFromComparisons(comparisons: ComparisonArtifact[]): BenchmarkReportVisualizationData | null {
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
  return buildVisualizationFromVisualizationComparisons(visualizationComparisons);
}

function resolveArtifactVisualization(
  report: ArtifactBenchmarkReport,
  evidence: BenchmarkReportRunEvidence | null,
): BenchmarkReportVisualizationData | null {
  if (report.visualization) {
    return report.visualization;
  }

  const comparisons = report.comparisons
    .map((comparison) => readComparisonArtifact(comparison.comparisonPath))
    .filter((comparison): comparison is ComparisonArtifact => Boolean(comparison));

  return buildVisualizationFromComparisons(comparisons) ?? buildVisualizationFromRunEvidence(evidence);
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
    evidence: null,
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
  const evidence = buildRunEvidence(benchmarkRoot);
  const surfaceLabel = benchmark.surfaceIds.length > 0
    ? benchmark.surfaceIds.join(", ")
    : "unknown surfaces";
  const strategyLabel = benchmark.guidanceStrategies.length > 0
    ? benchmark.guidanceStrategies.join(" vs ")
    : "strategy comparison";
  const modelLabel = benchmark.requestedModelLabel ?? benchmark.resolvedModelId ?? null;

  return {
    id: `run-${cohortId}`,
    source: "artifact",
    sourceLabel: "Run",
    sourceId: cohortId,
    fileName: path.basename(markdownPath),
    filePath: markdownPath,
    markdown,
    visualization: resolveArtifactVisualization(report, evidence),
    evidence,
    title: benchmark.surfaceIds.length > 1
      ? `Benchmark Suite Run ${cohortId}`
      : `Benchmark Run ${cohortId}`,
    summary: [surfaceLabel, strategyLabel, modelLabel].filter(Boolean).join(" · "),
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
