import { createHash, randomUUID } from "node:crypto";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SURFACEOPS_DESKTOP_SETUP_PATH } from "@surfaces/surfaceops-desktop-bridge";
import type {
  BenchmarkComparisonPair,
  BenchmarkRunManifest,
  BenchmarkSpecFixture,
  BenchmarkSpecManifest,
} from "@/lib/generation-benchmarks";
import {
  loadInterfacectlUiAstTools,
  runInterfacectlCli,
  resolveWorkspaceRoot,
  type InterfacectlUiAstIntegrationEvidence,
  type InterfacectlUiAstLifecycleRecord,
  type InterfacectlUiAstPromotionRecord,
  type InterfacectlUiAstReviewArtifact,
  type InterfacectlUiAstChange,
} from "@/lib/interfacectl";
import { loadSurfaceOpsDesktopModelState } from "@/lib/desktop-models";
import {
  BENCHMARK_FIXTURE_IDS,
  getBenchmarkFixture,
  getBenchmarkFixtureProfile,
  REFERENCE_TARGET_FIXTURE,
  type BenchmarkFixture,
  type BenchmarkFixtureGuidanceHints,
  type BenchmarkFixtureId,
  type BenchmarkFixtureProfile,
  type BenchmarkGuidanceStrategy,
} from "./benchmark-fixtures";
import {
  defaultSuggestedPathForKnownFinding,
  defaultSummaryForKnownFinding,
  suggestionSummaryNeedsRefresh,
  unresolvedExplanationForFinding,
} from "./finding-guidance";
import {
  runLocalLlmAgent,
  shapeLocalWorkbenchContract,
  type LocalLlmConfig,
  type LocalLlmTranscriptEntry,
} from "./local-llm";
import type {
  LocalWorkbenchAcceptedSuggestion,
  LocalWorkbenchAgentInput,
  LocalSuggestionStatus,
  LocalWorkbenchChatMessage,
  LocalWorkbenchComparison,
  LocalWorkbenchAstChange,
  LocalWorkbenchAstSummary,
  LocalWorkbenchData,
  LocalWorkbenchDesignerNote,
  LocalWorkbenchPublish,
  LocalWorkbenchRunDetail,
  LocalWorkbenchRunError,
  LocalWorkbenchRunPhase,
  LocalWorkbenchRunPhaseEntry,
  LocalWorkbenchRun,
  LocalWorkbenchSuggestion,
  PromotionReadinessReport,
  StartLocalRerunResult,
} from "./types";
import {
  REFERENCE_TARGET,
  REFERENCE_TARGET_BENCHMARK_PROFILE,
  type ReferenceTargetBenchmarkProfile,
  type ReferenceTargetGuidanceStrategy,
} from "./reference-target";

const TARGET = REFERENCE_TARGET;

const RERUN_ATTEMPT = "001";
const DEFAULT_LOCAL_LLM_BASE_URL = "http://127.0.0.1:1234/v1";
const DEFAULT_LOCAL_LLM_MODEL = "openai/gpt-oss-120b";
const UI_AST_SESSION_SCHEMA_VERSION = 3;
const IMPLEMENTATION_GUIDANCE_STRATEGY = "json-primary";
type ImplementationGuidanceStrategy = BenchmarkGuidanceStrategy;
type BenchmarkPlatformTarget = "web" | "ios" | "android";
type BenchmarkConsumerType = "web-browser" | "desktop-shell" | "ios-native" | "android-native";
type ContractRunOutcome = "pass" | "warn" | "fail" | "unknown";

interface CanonicalContractRunArtifact {
  runId: string;
  workspaceId: string;
  idempotencyKey: string;
  ingestedAt: string;
  createdAt: string;
  surfaceId: string;
  source: "generation";
  contract: {
    id: string;
    version: string;
    sha256: string;
  };
  artifacts: {
    reportPath: string;
  };
  status: ContractRunOutcome;
  findingCodes: string[];
  summary: {
    errorCount: number;
    warnCount: number;
  };
}

interface RunRecordFile {
  schemaVersion: number;
  runId: string;
  status: "running" | "succeeded" | "failed";
  createdAt: string;
  completedAt: string | null;
  model: string | null;
  currentPhase?: LocalWorkbenchRunPhase | null;
  phaseHistory?: LocalWorkbenchRunPhaseEntry[];
  agentSummary?: string | null;
  noChanges?: boolean;
  toolCallCount?: number;
  writeCount?: number;
  lastToolName?: string | null;
  lastError?: LocalWorkbenchRunError | null;
  baselinePreviewUrl?: string | null;
  baselinePreviewStdoutPath?: string | null;
  baselinePreviewStderrPath?: string | null;
  baselinePreviewStderrTail?: string[];
  currentPreviewUrl?: string | null;
  currentPreviewStdoutPath?: string | null;
  currentPreviewStderrPath?: string | null;
  currentPreviewStderrTail?: string[];
  astPath?: string | null;
  contractPath?: string | null;
  preparedInputPath: string | null;
  guidanceStrategy: string | null;
  guidanceHandoffPath: string | null;
  baselineSessionDir: string | null;
  currentSessionDir: string | null;
  baselinePreviewPath: string | null;
  currentPreviewPath: string | null;
  baselineSummaryPath: string | null;
  currentSummaryPath: string | null;
  comparisonPath: string | null;
  suggestionsPath: string | null;
  transcriptPath: string | null;
  effectiveAstPath?: string | null;
  effectiveContractPath?: string | null;
  agentInputPath: string | null;
  explainabilityPath: string | null;
  touchedFiles: string[];
  errorMessage: string | null;
}

const RUN_PHASES: LocalWorkbenchRunPhase[] = [
  "compile",
  "prepare",
  "baseline-validation",
  "baseline-preview",
  "agent",
  "current-validation",
  "current-preview",
  "finalize",
];
const PREVIEW_STDERR_TAIL_LINES = 20;
type PreviewLabel = "baseline" | "current";

interface PreviewServerHandle {
  child: ChildProcess;
  url: string;
  stdoutPath: string;
  stderrPath: string;
  getStderrTail: () => string[];
  getOutputTail: () => string;
}

interface LegacyContractDocument {
  contractId?: string;
  version?: string;
  description?: string;
  sections?: Array<{ id?: string }>;
  color?: {
    policy?: string;
    allowedValues?: string[];
  };
  surfaces?: Array<{
    id?: string;
    owner?: string;
    allowedFonts?: string[];
    layout?: { maxContentWidth?: number };
    requiredSections?: string[];
    governance?: {
      status?: string;
      roles?: {
        designers?: string[];
        engineers?: string[];
      };
    };
    runtime?: {
      policy?: string;
      mutationEnvelope?: {
        mode?: string;
        allowedSections?: string[];
      };
    };
  }>;
}

interface UiAstDocument {
  astId?: string;
  version?: string;
  description?: string;
  color?: {
    policy?: string;
    allowedValues?: string[];
  };
  surfaces?: Array<{
    id?: string;
    displayName?: string;
    rootNodeId?: string;
    nodes?: Array<{
      id?: string;
      kind?: string;
      sectionId?: string;
      children?: string[];
      actionIntent?: string;
      label?: string;
      description?: string;
    }>;
    platforms?: Array<{
      platform?: string;
      allowedFonts?: string[];
      layout?: {
        maxContentWidth?: number;
        requiredContainers?: string[];
      };
    }>;
    states?: Array<{
      id?: string;
      kind?: string;
      description?: string;
    }>;
    owner?: string;
    governance?: {
      status?: string;
      roles?: {
        designers?: string[];
        engineers?: string[];
      };
    };
    runtime?: {
      policy?: string;
      mutationEnvelope?: {
        mode?: string;
        allowedSections?: string[];
      };
    };
  }>;
  migration?: {
    escalations?: Array<{
      code?: string;
      message?: string;
      surfaceId?: string;
    }>;
  };
}

interface UiAstSessionFile {
  schemaVersion: 3;
  surfaceId: string;
  canonicalAstPath: string;
  updatedAt: string;
  workingAst: UiAstDocument;
  chat: LocalWorkbenchChatMessage[];
  activeAstChanges: LocalWorkbenchAstChange[];
  activeDesignerNotes: LocalWorkbenchDesignerNote[];
}

interface RunExplainabilityFile {
  schemaVersion: 3;
  runId: string;
  createdAt: string;
  effectiveAstPath: string | null;
  agentInputPath: string | null;
  guidanceStrategy: string | null;
  guidanceHandoffPath: string | null;
  activeAstChanges: LocalWorkbenchAstChange[];
  activeDesignerNotes: LocalWorkbenchDesignerNote[];
}

interface PublishRecordFile {
  schemaVersion: 2;
  publishId: string;
  status: "published";
  createdAt: string;
  sourceRunId: string | null;
  astPath?: string;
  contractPath?: string;
  bundleRoot: string;
  manifestPath: string;
  generationPayloadPath: string;
  runtimePayloadPath: string;
  integrationEvidencePath?: string | null;
  integrationEvidence?: InterfacectlUiAstIntegrationEvidence | null;
  promotionRecordPath?: string | null;
  promotionRecord?: InterfacectlUiAstPromotionRecord | null;
  promotionReadinessPath?: string | null;
  promotionReadiness?: PromotionReadinessReport | null;
}

interface FrozenRuntimeGuidancePaths {
  acceptedSuggestionsPath: string;
  designerNotesPath: string;
}

interface ReferenceTargetImplementationSessionResult {
  guidanceStrategy: ImplementationGuidanceStrategy;
  sessionId: string;
  sessionDir: string;
  transcriptPath: string;
  guidanceHandoffPath: string;
  agentInputPath: string;
  explainabilityPath: string;
  summaryPath: string;
  previewPath: string | null;
  touchedFiles: string[];
  noChanges: boolean;
  validate: Record<string, unknown>;
  comparison: LocalWorkbenchComparison | null;
  remainingAcceptedSuggestions: LocalWorkbenchAcceptedSuggestion[];
}

interface LocalLlmAgentBudgets {
  maxTurns?: number;
  maxToolCalls?: number;
  maxWallTimeMs?: number;
}

export interface BenchmarkCohortResult {
  cohortId: string;
  benchmarkDir: string;
  specPath: string;
  runPath: string;
  manifestPath: string;
  reportPath: string | null;
  comparisonPaths: string[];
  sessionDirs: string[];
  surfaceIds: string[];
}

export type ReferenceTargetBenchmarkCohortResult = BenchmarkCohortResult;

interface AcceptedSuggestionBacklogFile {
  schemaVersion: 1;
  surfaceId: string;
  updatedAt: string;
  suggestions: LocalWorkbenchAcceptedSuggestion[];
}

function stringifyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function parseJson<T>(text: string, label: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Could not parse ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function resolveRunRoot(): string {
  if (process.env.SURFACEOPS_LOCAL_RUNS_DIR?.trim()) {
    return path.resolve(process.env.SURFACEOPS_LOCAL_RUNS_DIR);
  }
  return path.join(resolveWorkspaceRoot(), ".scratch", "surfaceops-local-runs");
}

function resolveSandboxRoot(): string {
  if (process.env.SURFACEOPS_REPO_CLONE_ROOT?.trim()) {
    return path.resolve(process.env.SURFACEOPS_REPO_CLONE_ROOT);
  }
  return path.join(resolveWorkspaceRoot(), ".scratch", "surfaceops-local-sandboxes");
}

function resolveTargetContractPath(): string {
  return path.join(resolveWorkspaceRoot(), TARGET.contractPath);
}

function resolveTargetAstPath(): string {
  if (!TARGET.astPath) {
    throw new Error(`No canonical UI AST path is configured for ${TARGET.id}.`);
  }
  return path.join(resolveWorkspaceRoot(), TARGET.astPath);
}

function resolveTargetAppPath(): string {
  return path.join(resolveWorkspaceRoot(), TARGET.appPath);
}

function resolvePrimaryWorkspaceRoot(): string {
  const workspaceRoot = resolveWorkspaceRoot();
  const parent = path.dirname(workspaceRoot);
  if (path.basename(parent) === ".worktrees") {
    return path.dirname(parent);
  }
  return workspaceRoot;
}

function resolveSurfaceRoot(): string {
  return path.join(resolveRunRoot(), TARGET.id);
}

function resolveContractSessionPath(): string {
  return path.join(resolveSurfaceRoot(), "contract-session.json");
}

function resolveAcceptedSuggestionsPath(): string {
  return path.join(resolveSurfaceRoot(), "accepted-suggestions.json");
}

function resolveRunsDirectory(): string {
  return path.join(resolveSurfaceRoot(), "runs");
}

function resolvePublishesDirectory(): string {
  return path.join(resolveSurfaceRoot(), "publishes");
}

function resolveRunDirectory(runId: string): string {
  return path.join(resolveRunsDirectory(), runId);
}

function resolveRunRecordPath(runId: string): string {
  return path.join(resolveRunDirectory(runId), "run.json");
}

function resolvePublishDirectory(publishId: string): string {
  return path.join(resolvePublishesDirectory(), publishId);
}

function resolvePublishRecordPath(publishId: string): string {
  return path.join(resolvePublishDirectory(publishId), "publish.json");
}

function resolveCurrentPromotionReadinessPath(): string {
  return path.join(resolveSurfaceRoot(), "promotion-readiness.json");
}

function resolveCurrentPromotionReadinessContractPath(): string {
  return path.join(resolveSurfaceRoot(), "promotion-readiness.contract.json");
}
function resolveLocalLlmConfig(): LocalLlmConfig {
  const baseUrl = process.env.SURFACEOPS_LOCAL_LLM_BASE_URL?.trim() || DEFAULT_LOCAL_LLM_BASE_URL;
  const model = process.env.SURFACEOPS_LOCAL_LLM_MODEL?.trim() || DEFAULT_LOCAL_LLM_MODEL;
  return {
    baseUrl,
    model,
    ...(process.env.SURFACEOPS_LOCAL_LLM_API_KEY?.trim()
      ? { apiKey: process.env.SURFACEOPS_LOCAL_LLM_API_KEY.trim() }
      : {}),
  };
}

function resolveLocalModelState() {
  if (process.env.SURFACEOPS_DESKTOP_RUNTIME === "1") {
    const desktopState = loadSurfaceOpsDesktopModelState();
    const configured = Boolean(
      desktopState.hardwareProfile.supported
      && desktopState.installedModel
      && desktopState.activeModelId
      && desktopState.runtimeStatus.phase === "ready"
      && desktopState.runtimeStatus.healthy,
    );
    return {
      configured,
      baseUrl: resolveLocalLlmConfig().baseUrl,
      model: desktopState.activeModelId ?? resolveLocalLlmConfig().model,
      managementPath: SURFACEOPS_DESKTOP_SETUP_PATH,
      installState: desktopState.installState,
      runtimeStatus: desktopState.runtimeStatus,
      lastBenchmarkSummary: desktopState.lastBenchmarkSummary,
    };
  }

  const llm = resolveLocalLlmConfig();
  return {
    configured: true,
    baseUrl: llm.baseUrl,
    model: llm.model,
    managementPath: null,
    installState: null,
    runtimeStatus: null,
    lastBenchmarkSummary: null,
  };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return parseJson<T>(await fsp.readFile(filePath, "utf8"), filePath);
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, stringifyJson(value), "utf8");
}

async function migrateLegacyContractDocument(contract: LegacyContractDocument): Promise<UiAstDocument> {
  const tools = await loadInterfacectlUiAstTools();
  return tools.normalizeUiAst(tools.migrateLegacyContractToUiAst(contract)) as UiAstDocument;
}

async function deriveLegacyContractDocument(ast: UiAstDocument): Promise<LegacyContractDocument> {
  const tools = await loadInterfacectlUiAstTools();
  return tools.deriveLegacyContractFromUiAst(ast) as LegacyContractDocument;
}

async function normalizeUiAstDocument(ast: UiAstDocument): Promise<UiAstDocument> {
  const tools = await loadInterfacectlUiAstTools();
  return tools.normalizeUiAst(ast) as UiAstDocument;
}

async function applyUiAstDocumentChange(
  ast: UiAstDocument,
  change: InterfacectlUiAstChange,
): Promise<UiAstDocument> {
  const tools = await loadInterfacectlUiAstTools();
  return tools.applyUiAstChange(ast, change) as UiAstDocument;
}

function targetAstSurface(ast: UiAstDocument) {
  return ast.surfaces?.find((entry) => entry.id === TARGET.id) ?? ast.surfaces?.[0] ?? null;
}

function targetAstWebPlatform(ast: UiAstDocument) {
  const surface = targetAstSurface(ast);
  return surface?.platforms?.find((entry) => entry.platform === "web") ?? surface?.platforms?.[0] ?? null;
}

async function loadCanonicalTargetAst(): Promise<UiAstDocument> {
  const canonicalAstPath = resolveTargetAstPath();
  if (await fileExists(canonicalAstPath)) {
    return normalizeUiAstDocument(await readJsonFile<UiAstDocument>(canonicalAstPath));
  }
  return migrateLegacyContractDocument(await readJsonFile<LegacyContractDocument>(resolveTargetContractPath()));
}

async function loadFixtureUiAst(fixture: BenchmarkFixture): Promise<UiAstDocument> {
  const workspaceRoot = resolveWorkspaceRoot();
  if (fixture.astPath) {
    const astPath = path.join(workspaceRoot, fixture.astPath);
    if (await fileExists(astPath)) {
      return normalizeUiAstDocument(await readJsonFile<UiAstDocument>(astPath));
    }
  }
  return migrateLegacyContractDocument(
    await readJsonFile<LegacyContractDocument>(path.join(workspaceRoot, fixture.contractPath)),
  );
}

async function summarizeUiAstDocument(ast: UiAstDocument): Promise<LocalWorkbenchAstSummary> {
  const tools = await loadInterfacectlUiAstTools();
  const normalized = tools.normalizeUiAst(ast) as UiAstDocument;
  const genericSummary = tools.summarizeUiAst(normalized) as {
    astId: string;
    version: string;
    surfaceCount: number;
    platformCount: number;
    nodeCount: number;
    migrationEscalationCount: number;
    surfaces: Array<{
      surfaceId: string;
      platforms: string[];
      sectionIds: string[];
      owner: string | null;
      governanceStatus: string | null;
      runtimePolicy: string | null;
      maxContentWidthByPlatform: Partial<Record<string, number>>;
    }>;
  };
  const surface = targetAstSurface(normalized);
  const webPlatform = targetAstWebPlatform(normalized);
  const surfaceSummary =
    genericSummary.surfaces.find((entry) => entry.surfaceId === TARGET.id) ?? genericSummary.surfaces[0] ?? null;

  return {
    astId: genericSummary.astId,
    version: genericSummary.version,
    description: normalized.description ?? "",
    surfaceCount: genericSummary.surfaceCount,
    platformCount: genericSummary.platformCount,
    nodeCount: genericSummary.nodeCount,
    migrationEscalationCount: genericSummary.migrationEscalationCount,
    platformIds: surfaceSummary?.platforms ?? [],
    requiredSections: surfaceSummary?.sectionIds ?? [],
    allowedFonts: [...new Set(webPlatform?.allowedFonts ?? [])],
    maxContentWidth:
      typeof webPlatform?.layout?.maxContentWidth === "number" ? webPlatform.layout.maxContentWidth : null,
    colorPolicy: normalized.color?.policy ?? "off",
    allowedColors: [...new Set(normalized.color?.allowedValues ?? [])],
    owner: surfaceSummary?.owner ?? null,
    governanceStatus: surfaceSummary?.governanceStatus ?? null,
    runtimePolicy: surfaceSummary?.runtimePolicy ?? "off",
    mutationMode:
      typeof surface?.runtime?.mutationEnvelope?.mode === "string"
        ? surface.runtime.mutationEnvelope.mode
        : null,
  };
}

async function buildLifecycleSummary(
  ast: UiAstDocument,
  options: {
    publishedAt?: string;
    observedAt?: string;
    lastRuntimeVerdict?: string;
  } = {},
) {
  const tools = await loadInterfacectlUiAstTools();
  const lifecycle = tools.buildUiAstLifecycleRecord(ast, {
    surfaceId: TARGET.id,
    validationStatus: "passed",
    ...(options.publishedAt ? { publishedAt: options.publishedAt } : {}),
    ...(options.observedAt ? { observedAt: options.observedAt } : {}),
    ...(options.lastRuntimeVerdict ? { lastRuntimeVerdict: options.lastRuntimeVerdict } : {}),
  }) as InterfacectlUiAstLifecycleRecord;

  return {
    stage: lifecycle.stage,
    validationStatus: lifecycle.validation.status,
    approvalStatus: lifecycle.approval.status,
    publicationStatus: lifecycle.publication.status,
    observationStatus: lifecycle.observation.status,
    requiredRoles: lifecycle.approval.requiredRoles,
  };
}

async function buildReviewSummary(canonicalAst: UiAstDocument, workingAst: UiAstDocument) {
  const tools = await loadInterfacectlUiAstTools();
  const review = tools.buildUiAstReviewArtifact(
    canonicalAst,
    workingAst,
    TARGET.id,
  ) as InterfacectlUiAstReviewArtifact;

  return {
    status: review.review.status,
    requiresHumanReview: review.review.requiresHumanReview,
    changeCount: review.summary.changeCount,
    nodeChangeCount: review.summary.nodeChangeCount,
    governanceChangeCount: review.summary.governanceChangeCount,
    platformChangeCount: review.summary.platformChangeCount,
  };
}

async function summarizeIntegrationEvidence(
  filePath: string | null | undefined,
) {
  if (!filePath || !(await fileExists(filePath))) {
    return null;
  }
  const evidence = await readJsonFile<InterfacectlUiAstIntegrationEvidence>(filePath);
  const passCount = evidence.compatibilityChecks.filter((entry) => entry.status === "pass").length;
  const warnCount = evidence.compatibilityChecks.filter((entry) => entry.status === "warn").length;
  const blockCount = evidence.compatibilityChecks.filter((entry) => entry.status === "block").length;
  return {
    consumer: evidence.consumer,
    platform: evidence.platform,
    integratedAt: evidence.integratedAt,
    passCount,
    warnCount,
    blockCount,
    exceptionCount: evidence.exceptions.length,
  };
}

async function uiAstSummaryText(ast: UiAstDocument): Promise<string> {
  const summary = await summarizeUiAstDocument(ast);
  return [
    `${summary.astId} v${summary.version}`,
    summary.description || "Working UI AST for the local workbench.",
    `Platforms: ${summary.platformIds.join(", ") || "none recorded"}`,
    `Required sections: ${summary.requiredSections.join(", ") || "none recorded"}`,
    `Fonts: ${summary.allowedFonts.join(", ") || "none recorded"}`,
    `Max content width: ${summary.maxContentWidth ?? "not specified"}`,
    `Color policy: ${summary.colorPolicy}`,
    `Allowed colors: ${summary.allowedColors.join(", ") || "none recorded"}`,
    `Owner: ${summary.owner ?? "unassigned"}`,
    `Governance status: ${summary.governanceStatus ?? "draft"}`,
    `Runtime policy: ${summary.runtimePolicy}`,
    `Mutation mode: ${summary.mutationMode ?? "unspecified"}`,
    `Surface count: ${summary.surfaceCount}`,
    `Platform projection count: ${summary.platformCount}`,
    `Node count: ${summary.nodeCount}`,
    `Migration escalations: ${summary.migrationEscalationCount}`,
  ].join("\n");
}

function buildUiAstSummaryMessage(summaryText: string): LocalWorkbenchChatMessage {
  return {
    id: "ui-ast-summary",
    role: "system",
    title: "Working UI AST",
    content: summaryText,
    createdAt: new Date(0).toISOString(),
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readTextFile(filePath: string | null): Promise<string | null> {
  if (!filePath || !(await fileExists(filePath))) {
    return null;
  }
  return fsp.readFile(filePath, "utf8");
}

function dataUrlForPng(filePath: string | null): string | null {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function buildStderrTail(existing: string[], chunk: string): string[] {
  return `${existing.join("\n")}\n${chunk}`
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(-PREVIEW_STDERR_TAIL_LINES);
}

function previewDebugPatch(
  label: PreviewLabel,
  value: {
    url?: string | null;
    stdoutPath?: string | null;
    stderrPath?: string | null;
    stderrTail?: string[];
  },
): Partial<RunRecordFile> {
  if (label === "baseline") {
    return {
      ...(value.url !== undefined ? { baselinePreviewUrl: value.url } : {}),
      ...(value.stdoutPath !== undefined ? { baselinePreviewStdoutPath: value.stdoutPath } : {}),
      ...(value.stderrPath !== undefined ? { baselinePreviewStderrPath: value.stderrPath } : {}),
      ...(value.stderrTail !== undefined ? { baselinePreviewStderrTail: value.stderrTail } : {}),
    };
  }
  return {
    ...(value.url !== undefined ? { currentPreviewUrl: value.url } : {}),
    ...(value.stdoutPath !== undefined ? { currentPreviewStdoutPath: value.stdoutPath } : {}),
    ...(value.stderrPath !== undefined ? { currentPreviewStderrPath: value.stderrPath } : {}),
    ...(value.stderrTail !== undefined ? { currentPreviewStderrTail: value.stderrTail } : {}),
  };
}

function resolveDependencySource(relativePath: string): string | null {
  const workspaceRoot = resolveWorkspaceRoot();
  const primaryRoot = resolvePrimaryWorkspaceRoot();
  const candidates = [
    path.join(workspaceRoot, relativePath),
    primaryRoot === workspaceRoot ? null : path.join(primaryRoot, relativePath),
    path.join(process.cwd(), relativePath),
  ].filter((entry): entry is string => Boolean(entry));

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function resolvePromotionReadinessScriptPath(): string | null {
  const dependencyPath = resolveDependencySource("scripts/check-promotion-readiness.mjs");
  if (dependencyPath) {
    return dependencyPath;
  }

  const moduleRelativePath = fileURLToPath(new URL("../../../../scripts/check-promotion-readiness.mjs", import.meta.url));
  return fs.existsSync(moduleRelativePath) ? moduleRelativePath : null;
}

async function execNodeScript(
  scriptPath: string,
  args: string[],
  options: {
    cwd: string;
    acceptExitCodes?: number[];
  },
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [scriptPath, ...args],
      {
        cwd: options.cwd,
        env: process.env,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const exitCode =
          typeof (error as NodeJS.ErrnoException | null)?.code === "number"
            ? Number((error as NodeJS.ErrnoException).code)
            : 0;
        const acceptedExitCodes = new Set([0, ...(options.acceptExitCodes ?? [])]);
        if (error && !acceptedExitCodes.has(exitCode)) {
          reject(
            new Error(
              [
                `${path.basename(scriptPath)} exited with code ${exitCode}.`,
                stderr.trim(),
                stdout.trim(),
              ].filter(Boolean).join("\n"),
            ),
          );
          return;
        }

        resolve({ exitCode, stdout, stderr });
      },
    );
  });
}

function warningFindingCount(validatePayload: Record<string, unknown>): number {
  const findings = Array.isArray(validatePayload.findings) ? validatePayload.findings : [];
  return findings.filter((entry) => {
    if (!entry || typeof entry !== "object") return false;
    return String((entry as Record<string, unknown>).severity ?? "") === "warning";
  }).length;
}

function mapValidateStatusToOutcome(validatePayload: Record<string, unknown>): ContractRunOutcome {
  const status = String(validatePayload.status ?? "unknown");
  if (status === "pass") return "pass";
  if (status === "warn") return "warn";
  if (status === "block" || status === "fail") return "fail";
  return "unknown";
}

function resolveCanonicalContractRunsPath(): string {
  return path.join(resolveWorkspaceRoot(), "contracts", "generated", "contract-runs.json");
}

function resolveCanonicalContractLineagePath(): string {
  return path.join(resolveWorkspaceRoot(), "contracts", "generated", "contract-lineage.json");
}

function compareCanonicalRunsAscending(
  left: CanonicalContractRunArtifact,
  right: CanonicalContractRunArtifact,
): number {
  const timeDiff = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  if (timeDiff !== 0) {
    return timeDiff;
  }
  return left.runId.localeCompare(right.runId);
}

function dedupeCanonicalRuns(
  runs: CanonicalContractRunArtifact[],
): CanonicalContractRunArtifact[] {
  const byRunId = new Set<string>();
  const byIdempotencyKey = new Set<string>();
  const deduped: CanonicalContractRunArtifact[] = [];

  for (const run of [...runs].sort(compareCanonicalRunsAscending)) {
    const runKey = `${run.workspaceId}:${run.runId}`;
    const idempotencyKey = `${run.workspaceId}:${run.idempotencyKey}`;
    if (byRunId.has(runKey) || byIdempotencyKey.has(idempotencyKey)) {
      continue;
    }
    byRunId.add(runKey);
    byIdempotencyKey.add(idempotencyKey);
    deduped.push(run);
  }

  return deduped;
}

async function loadCanonicalRuns(): Promise<CanonicalContractRunArtifact[]> {
  const runsPath = resolveCanonicalContractRunsPath();
  if (!(await fileExists(runsPath))) {
    return [];
  }

  const existing = await readJsonFile<{ runs?: CanonicalContractRunArtifact[] }>(runsPath);
  return Array.isArray(existing.runs) ? existing.runs : [];
}

function buildCanonicalLineage(
  runs: CanonicalContractRunArtifact[],
): Record<string, {
  lastRunId: string;
  lastRunAt: string;
  lastSource: "generation";
  lastStatus: ContractRunOutcome;
  contract: CanonicalContractRunArtifact["contract"];
  artifacts: CanonicalContractRunArtifact["artifacts"];
  findingCodes: string[];
}> {
  const surfaces: Record<string, {
    lastRunId: string;
    lastRunAt: string;
    lastSource: "generation";
    lastStatus: ContractRunOutcome;
    contract: CanonicalContractRunArtifact["contract"];
    artifacts: CanonicalContractRunArtifact["artifacts"];
    findingCodes: string[];
  }> = {};

  for (const run of [...runs].sort(compareCanonicalRunsAscending)) {
    surfaces[run.surfaceId] = {
      lastRunId: run.runId,
      lastRunAt: run.createdAt,
      lastSource: run.source,
      lastStatus: run.status,
      contract: run.contract,
      artifacts: run.artifacts,
      findingCodes: run.findingCodes,
    };
  }

  return surfaces;
}

async function appendCanonicalRunArtifact(run: CanonicalContractRunArtifact): Promise<void> {
  const existingRuns = await loadCanonicalRuns();
  const nextRuns = dedupeCanonicalRuns([...existingRuns, run]).sort(compareCanonicalRunsAscending);
  await writeJsonFile(resolveCanonicalContractRunsPath(), {
    schemaVersion: 2,
    runs: nextRuns,
  });
  await writeJsonFile(resolveCanonicalContractLineagePath(), {
    schemaVersion: 1,
    surfaces: buildCanonicalLineage(nextRuns),
  });
}

async function appendLocalWorkbenchGenerationRunArtifact(input: {
  runId: string;
  createdAt: string;
  effectiveAstPath: string;
  validatePath: string;
  validatePayload: Record<string, unknown>;
}): Promise<void> {
  const ast = await readJsonFile<UiAstDocument>(input.effectiveAstPath);
  const contract = await deriveLegacyContractDocument(ast);
  const contractId =
    typeof contract.contractId === "string" && contract.contractId.trim().length > 0
      ? contract.contractId
      : TARGET.id;
  const version =
    typeof contract.version === "string" && contract.version.trim().length > 0
      ? contract.version
      : "unknown";

  await appendCanonicalRunArtifact({
    runId: input.runId,
    workspaceId: "ws-local-default",
    ingestedAt: new Date().toISOString(),
    createdAt: input.createdAt,
    source: "generation",
    surfaceId: TARGET.id,
    idempotencyKey: `local-workbench:${input.runId}`,
    contract: {
      id: contractId,
      version,
      sha256: sha256String(stringifyJson(contract)),
    },
    artifacts: {
      reportPath: input.validatePath,
    },
    status: mapValidateStatusToOutcome(input.validatePayload),
    findingCodes: normalizeFindingCodes(input.validatePayload),
    summary: {
      errorCount: blockingFindingCount(input.validatePayload),
      warnCount: warningFindingCount(input.validatePayload),
    },
  });
}

function promotionReadinessSurface(
  report: PromotionReadinessReport,
): PromotionReadinessReport["surfaces"][number] | null {
  return report.surfaces.find((surface) => surface.surfaceId === TARGET.id) ?? report.surfaces[0] ?? null;
}

function recomputePromotionReadinessSummary(report: PromotionReadinessReport): PromotionReadinessReport {
  const readySurfaces = report.surfaces.filter((surface) => surface.ready).length;
  return {
    ...report,
    summary: {
      totalSurfaces: report.surfaces.length,
      readySurfaces,
      notReadySurfaces: report.surfaces.length - readySurfaces,
      readyForPromotion: readySurfaces === report.surfaces.length,
    },
  };
}

function applyLocalWorkbenchPromotionGates(
  report: PromotionReadinessReport,
  latestRunOperatorNote: string | null,
): PromotionReadinessReport {
  if (!latestRunOperatorNote) {
    return report;
  }

  const surface = promotionReadinessSurface(report);
  if (!surface) {
    return report;
  }

  const latestGenerationRun =
    surface.sourceKpis.find((entry) => entry.source === "generation")?.latestRun ??
    surface.checks.find((entry) => entry.latestRun)?.latestRun ??
    null;

  const nextSurface = {
    ...surface,
    ready: false,
    checks: [
      ...surface.checks.filter((entry) => entry.code !== "promotion.accepted-guidance-unresolved"),
      {
        source: "accepted-guidance",
        ready: false,
        code: "promotion.accepted-guidance-unresolved",
        message: latestRunOperatorNote,
        latestRun: latestGenerationRun,
      },
    ],
  };

  const nextReport = {
    ...report,
    surfaces: report.surfaces.map((entry) => (entry.surfaceId === nextSurface.surfaceId ? nextSurface : entry)),
  };
  return recomputePromotionReadinessSummary(nextReport);
}

async function generatePromotionReadinessReport(input: {
  contractPath: string;
  outputPath: string;
  mode: PromotionReadinessReport["mode"];
  latestRunOperatorNote: string | null;
}): Promise<PromotionReadinessReport> {
  const scriptPath = resolvePromotionReadinessScriptPath();
  if (!scriptPath) {
    throw new Error("Could not locate scripts/check-promotion-readiness.mjs.");
  }

  const result = await execNodeScript(
    scriptPath,
    [
      "--root",
      resolveWorkspaceRoot(),
      "--contract",
      input.contractPath,
      "--surfaces",
      TARGET.id,
      "--required-sources",
      "generation",
      "--mode",
      input.mode,
      "--output",
      input.outputPath,
    ],
    {
      cwd: resolveWorkspaceRoot(),
      acceptExitCodes: input.mode === "block" ? [1] : [],
    },
  );

  if (input.mode === "advisory" && result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "Promotion readiness failed.");
  }
  if (!(await fileExists(input.outputPath))) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "Promotion readiness did not write a report.");
  }

  const baseReport = await readJsonFile<PromotionReadinessReport>(input.outputPath);
  const nextReport = applyLocalWorkbenchPromotionGates(baseReport, input.latestRunOperatorNote);
  await writeJsonFile(input.outputPath, nextReport);
  return nextReport;
}

function firstPromotionReadinessBlocker(report: PromotionReadinessReport | null): string | null {
  const surface = report ? promotionReadinessSurface(report) : null;
  return surface?.checks.find((entry) => !entry.ready)?.message ?? null;
}

function normalizePhaseHistory(value: unknown): LocalWorkbenchRunPhaseEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
    .map((entry): LocalWorkbenchRunPhaseEntry => {
      const status: LocalWorkbenchRunPhaseEntry["status"] =
        String(entry.status ?? "") === "failed"
          ? "failed"
          : String(entry.status ?? "") === "succeeded"
            ? "succeeded"
            : "running";
      return {
        phase: RUN_PHASES.includes(String(entry.phase ?? "") as LocalWorkbenchRunPhase)
          ? (String(entry.phase) as LocalWorkbenchRunPhase)
          : "compile",
        status,
        startedAt: String(entry.startedAt ?? ""),
        completedAt: typeof entry.completedAt === "string" ? entry.completedAt : null,
        message: typeof entry.message === "string" ? entry.message : null,
      };
    })
    .filter((entry) => entry.startedAt);
}

function normalizeRunRecord(record: RunRecordFile): RunRecordFile {
  return {
    ...record,
    schemaVersion: typeof record.schemaVersion === "number" ? record.schemaVersion : 3,
    model: typeof record.model === "string" ? record.model : null,
    currentPhase: RUN_PHASES.includes(String(record.currentPhase ?? "") as LocalWorkbenchRunPhase)
      ? (String(record.currentPhase) as LocalWorkbenchRunPhase)
      : null,
    phaseHistory: normalizePhaseHistory(record.phaseHistory),
    agentSummary: typeof record.agentSummary === "string" ? record.agentSummary : null,
    noChanges: Boolean(record.noChanges),
    toolCallCount: typeof record.toolCallCount === "number" ? record.toolCallCount : 0,
    writeCount: typeof record.writeCount === "number" ? record.writeCount : 0,
    lastToolName: typeof record.lastToolName === "string" ? record.lastToolName : null,
    lastError:
      record.lastError && typeof record.lastError === "object" && typeof record.lastError.message === "string"
        ? {
            phase: RUN_PHASES.includes(String((record.lastError as LocalWorkbenchRunError).phase ?? "") as LocalWorkbenchRunPhase)
              ? (String((record.lastError as LocalWorkbenchRunError).phase) as LocalWorkbenchRunPhase)
              : "unknown",
            message: String((record.lastError as LocalWorkbenchRunError).message),
          }
        : null,
    baselinePreviewUrl: typeof record.baselinePreviewUrl === "string" ? record.baselinePreviewUrl : null,
    baselinePreviewStdoutPath: typeof record.baselinePreviewStdoutPath === "string" ? record.baselinePreviewStdoutPath : null,
    baselinePreviewStderrPath: typeof record.baselinePreviewStderrPath === "string" ? record.baselinePreviewStderrPath : null,
    baselinePreviewStderrTail: Array.isArray(record.baselinePreviewStderrTail)
      ? record.baselinePreviewStderrTail.filter((entry): entry is string => typeof entry === "string")
      : [],
    currentPreviewUrl: typeof record.currentPreviewUrl === "string" ? record.currentPreviewUrl : null,
    currentPreviewStdoutPath: typeof record.currentPreviewStdoutPath === "string" ? record.currentPreviewStdoutPath : null,
    currentPreviewStderrPath: typeof record.currentPreviewStderrPath === "string" ? record.currentPreviewStderrPath : null,
    currentPreviewStderrTail: Array.isArray(record.currentPreviewStderrTail)
      ? record.currentPreviewStderrTail.filter((entry): entry is string => typeof entry === "string")
      : [],
  };
}

function withRunPhaseMessage(
  phaseHistory: LocalWorkbenchRunPhaseEntry[],
  phase: LocalWorkbenchRunPhase,
  status: LocalWorkbenchRunPhaseEntry["status"],
  message: string | null,
): LocalWorkbenchRunPhaseEntry[] {
  const nextHistory = [...phaseHistory];
  const current = nextHistory.findLastIndex((entry) => entry.phase === phase);
  if (current === -1) {
    nextHistory.push({
      phase,
      status,
      startedAt: new Date().toISOString(),
      completedAt: status === "running" ? null : new Date().toISOString(),
      message,
    });
    return nextHistory;
  }
  const previous = nextHistory[current];
  nextHistory[current] = {
    ...previous,
    status,
    completedAt: status === "running" ? previous.completedAt : new Date().toISOString(),
    message: message ?? previous.message,
  };
  return nextHistory;
}

function cloneUiAst(ast: UiAstDocument): UiAstDocument {
  return parseJson<UiAstDocument>(JSON.stringify(ast), "working UI AST clone");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function extractRepairEntries(repairMap: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(repairMap)) {
    return repairMap.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object" && !Array.isArray(entry)));
  }
  const repairMapRecord = asRecord(repairMap);
  const repairs = repairMapRecord?.repairs;
  if (!Array.isArray(repairs)) {
    return [];
  }
  return repairs.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object" && !Array.isArray(entry)));
}

function isGenericSuggestionSummary(summary: string, findingCode: string): boolean {
  const trimmed = summary.trim();
  return !trimmed || trimmed === `Review and refine ${findingCode}.` || trimmed === `Review and refine ${findingCode}`;
}

interface SuggestionGuidanceContext {
  appPath: string;
  guidanceHints?: BenchmarkFixtureGuidanceHints | null;
}

function buildFindingGuidanceContext(
  context: SuggestionGuidanceContext | null | undefined,
  suggestedPath: string | null = null,
) {
  return {
    appPath: context?.appPath,
    suggestedPath,
    guidanceHints: context?.guidanceHints,
  };
}

function asTrimmedStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function resolveSectionPath(
  sectionIds: string[],
  context: SuggestionGuidanceContext | null | undefined,
): string | null {
  const sectionPaths = context?.guidanceHints?.sectionPaths ?? {};
  for (const sectionId of sectionIds) {
    const nextPath = sectionPaths[sectionId];
    if (nextPath?.trim()) {
      return nextPath;
    }
  }
  return context?.guidanceHints?.primaryPagePath ?? null;
}

function resolveRepairGuidance(input: {
  findingCode: string;
  findingMessage: string;
  repair: Record<string, unknown> | null;
  locationFile: string | null;
  context: SuggestionGuidanceContext | null | undefined;
}): { summary: string | null; suggestedPath: string | null } {
  const action = asRecord(input.repair?.action) ?? {};
  const actionType = typeof action.type === "string" ? action.type : "";
  const stylesPath = input.context?.guidanceHints?.stylesPath ?? `${input.context?.appPath ?? TARGET.appPath}/app/globals.css`;
  const pageFramePath = input.context?.guidanceHints?.pageFramePath ?? input.context?.guidanceHints?.primaryPagePath ?? `${input.context?.appPath ?? TARGET.appPath}/app/page.tsx`;
  const widthPath = input.context?.guidanceHints?.widthPath ?? stylesPath;
  const interactionPath = input.locationFile ?? input.context?.guidanceHints?.primaryPagePath ?? pageFramePath;

  switch (actionType) {
    case "ensure-required-sections": {
      const sectionIds = asTrimmedStringArray(action.sectionIds);
      const suggestedPath = resolveSectionPath(sectionIds, input.context) ?? input.locationFile ?? pageFramePath;
      const sectionSummary = sectionIds.length > 0 ? sectionIds.join(", ") : "the required contract sections";
      return {
        suggestedPath,
        summary: `Restore ${sectionSummary} in ${suggestedPath} using real data-contract-section markers while preserving the existing fixture structure.`,
      };
    }
    case "restrict-motion-durations":
      return {
        suggestedPath: stylesPath,
        summary: `Update ${stylesPath} so the existing motion declarations use literal 120ms timing and stay attached to selectors already rendered by the fixture.`,
      };
    case "restrict-motion-timing":
      return {
        suggestedPath: stylesPath,
        summary: `Update ${stylesPath} so the existing motion declarations use literal linear timing and stay attached to selectors already rendered by the fixture.`,
      };
    case "restrict-fonts": {
      const allowedFonts = asTrimmedStringArray(action.allowedFonts);
      return {
        suggestedPath: stylesPath,
        summary: `Update ${stylesPath} so rendered text uses only the allowed font stack${allowedFonts.length > 0 ? ` (${allowedFonts.join(", ")})` : ""}.`,
      };
    }
    case "reduce-content-width": {
      const maxContentWidth = typeof action.maxContentWidth === "number" ? action.maxContentWidth : null;
      return {
        suggestedPath: widthPath,
        summary: `Reduce the page-frame width in ${widthPath}${maxContentWidth ? ` so the rendered surface does not exceed ${maxContentWidth}px` : ""}.`,
      };
    }
    case "increase-hit-area": {
      const minHitAreaPx = typeof action.minHitAreaPx === "number" ? action.minHitAreaPx : 44;
      return {
        suggestedPath: interactionPath,
        summary: `Increase the affected control hit area in ${interactionPath} so observed targets render at least ${minHitAreaPx}x${minHitAreaPx} CSS px.`,
      };
    }
    case "increase-target-gap": {
      const minGapPx = typeof action.minGapPx === "number" ? action.minGapPx : 8;
      return {
        suggestedPath: interactionPath,
        summary: `Increase spacing between adjacent controls in ${interactionPath} so observed targets keep at least ${minGapPx}px separation.`,
      };
    }
    case "move-away-from-edge": {
      const minEdgeInsetPx = typeof action.minEdgeInsetPx === "number" ? action.minEdgeInsetPx : 8;
      return {
        suggestedPath: interactionPath,
        summary: `Move the edge-pinned control inward in ${interactionPath} so it keeps at least ${minEdgeInsetPx}px inset from the viewport edge.`,
      };
    }
    case "separate-destructive-action": {
      const destructiveGapPx = typeof action.destructiveGapPx === "number" ? action.destructiveGapPx : 16;
      return {
        suggestedPath: interactionPath,
        summary: `Separate destructive controls from adjacent safe actions in ${interactionPath} so the destructive target keeps at least ${destructiveGapPx}px clearance.`,
      };
    }
    case "restore-flow-observability":
      return {
        suggestedPath: interactionPath,
        summary: `Restore explicit data-contract-flow-id, data-contract-flow-step, and data-contract-flow-transition-to markers in ${interactionPath} so the declared task flow is observable again.`,
      };
    case "restore-required-flows":
      return {
        suggestedPath: interactionPath,
        summary: `Restore the required task flow in ${interactionPath} so the declared request, review, and confirm path is present again.`,
      };
    case "restore-required-flow-steps":
      return {
        suggestedPath: interactionPath,
        summary: `Restore the missing required flow step marker in ${interactionPath} so the observed flow includes every declared step.`,
      };
    case "restore-required-transitions":
      return {
        suggestedPath: interactionPath,
        summary: `Restore the missing transition marker in ${interactionPath} so the observed flow preserves the declared step-to-step path.`,
      };
    case "add-loading-state":
    case "add-empty-state":
      return {
        suggestedPath: interactionPath,
        summary: defaultSummaryForFinding(input.findingCode, input.findingMessage, input.context, interactionPath),
      };
    case "add-error-retry":
      return {
        suggestedPath: interactionPath,
        summary: `Add the required recovery action in ${interactionPath} so the error state exposes an explicit retry or corrective affordance.`,
      };
    case "preserve-last-good-content":
      return {
        suggestedPath: interactionPath,
        summary: `Preserve the last good content in ${interactionPath} so the failing async state keeps the required sections visible and marked as preserved.`,
      };
    case "disable-pending-submit":
      return {
        suggestedPath: interactionPath,
        summary: `Disable pending submit actions in ${interactionPath} so the loading state blocks the declared interactions while work is in flight.`,
      };
    default:
      break;
  }

  switch (input.findingCode) {
    case "layout.container-missing":
    case "layout.pageframe.container-not-found":
      return {
        suggestedPath: pageFramePath,
        summary: `Restore the required page-container marker in ${pageFramePath}.`,
      };
    case "layout.pageframe.maxwidth-mismatch":
    case "layout.pageframe.minwidth-mismatch":
    case "layout.pageframe.padding-mismatch":
    case "layout.pageframe.non-deterministic-value":
    case "layout.pageframe.unextractable-value":
      return {
        suggestedPath: widthPath,
        summary: input.findingMessage?.trim()
          ? `Address ${input.findingCode} in ${widthPath}: ${input.findingMessage.trim()}`
          : `Restore the required page-frame sizing rules in ${widthPath}.`,
      };
    default:
      return {
        summary: null,
        suggestedPath: null,
      };
  }
}

function isGenericSuggestionPath(suggestedPath: string, appPath: string): boolean {
  const normalized = suggestedPath.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  return !normalized || normalized === appPath;
}

function defaultSuggestedPathForFinding(
  findingCode: string,
  locationFile: string | null,
  context: SuggestionGuidanceContext | null | undefined = null,
): string {
  if (locationFile?.trim()) {
    return locationFile.trim();
  }
  const knownPath = defaultSuggestedPathForKnownFinding(
    findingCode,
    buildFindingGuidanceContext(context, locationFile),
  );
  if (knownPath) {
    return knownPath;
  }
  switch (findingCode) {
    case "layout.container-missing":
    case "layout.pageframe.container-not-found":
      return context?.guidanceHints?.pageFramePath ?? context?.guidanceHints?.primaryPagePath ?? `${context?.appPath ?? TARGET.appPath}/app/page.tsx`;
    case "section.missing":
    case "section.unexpected":
      return context?.guidanceHints?.primaryPagePath ?? `${context?.appPath ?? TARGET.appPath}/app/page.tsx`;
    default:
      return context?.appPath ?? TARGET.appPath;
  }
}

function defaultSummaryForFinding(
  findingCode: string,
  findingMessage: string,
  context: SuggestionGuidanceContext | null | undefined = null,
  suggestedPath: string | null = null,
): string {
  const knownSummary = defaultSummaryForKnownFinding(
    findingCode,
    buildFindingGuidanceContext(context, suggestedPath),
  );
  if (knownSummary) {
    return knownSummary;
  }
  switch (findingCode) {
    case "layout.container-missing":
    case "layout.pageframe.container-not-found":
      return `Restore the required page-container marker in ${context?.guidanceHints?.pageFramePath ?? `${context?.appPath ?? TARGET.appPath}/app/page.tsx`}.`;
    default:
      return findingMessage?.trim() ? `Address ${findingCode}: ${findingMessage.trim()}` : `Review and refine ${findingCode}.`;
  }
}

function enrichSuggestionGuidance<T extends {
  findingCode: string;
  findingMessage: string;
  summary: string;
  suggestedPath: string;
}>(suggestion: T, locationFile: string | null = null, context: SuggestionGuidanceContext | null | undefined = null): T {
  const appPath = context?.appPath ?? TARGET.appPath;
  const nextSuggestedPath = isGenericSuggestionPath(suggestion.suggestedPath, appPath)
    ? defaultSuggestedPathForFinding(suggestion.findingCode, locationFile, context)
    : suggestion.suggestedPath;
  const nextSummary = (isGenericSuggestionSummary(suggestion.summary, suggestion.findingCode)
    || suggestionSummaryNeedsRefresh(suggestion.summary, suggestion.findingCode))
    ? defaultSummaryForFinding(
        suggestion.findingCode,
        suggestion.findingMessage,
        context,
        locationFile ?? nextSuggestedPath,
      )
    : suggestion.summary;
  return {
    ...suggestion,
    suggestedPath: nextSuggestedPath,
    summary: nextSummary,
  };
}

function normalizeAcceptedSuggestion(
  entry: unknown,
  context: SuggestionGuidanceContext | null | undefined = null,
): LocalWorkbenchAcceptedSuggestion | null {
  const record = asRecord(entry);
  if (!record) {
    return null;
  }
  const findingCode = typeof record.findingCode === "string" ? record.findingCode : "";
  const findingMessage = typeof record.findingMessage === "string" ? record.findingMessage : "";
  const summary = typeof record.summary === "string" ? record.summary : "";
  const suggestedPath = typeof record.suggestedPath === "string" ? record.suggestedPath : "";
  const sourceRunId = typeof record.sourceRunId === "string" ? record.sourceRunId : "";
  const acceptedAt = typeof record.acceptedAt === "string" ? record.acceptedAt : "";
  if (!findingCode || !findingMessage || !summary || !suggestedPath || !sourceRunId || !acceptedAt) {
    return null;
  }
  return enrichSuggestionGuidance({
    findingCode,
    findingMessage,
    summary,
    suggestedPath,
    sourceRunId,
    acceptedAt,
    ...(typeof record.rationale === "string" ? { rationale: record.rationale } : {}),
  }, null, context);
}

async function loadAcceptedSuggestions(): Promise<LocalWorkbenchAcceptedSuggestion[]> {
  const acceptedSuggestionsPath = resolveAcceptedSuggestionsPath();
  if (!(await fileExists(acceptedSuggestionsPath))) {
    return [];
  }
  const payload = await readJsonFile<Record<string, unknown>>(acceptedSuggestionsPath);
  const suggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
  return suggestions
    .map((entry) => normalizeAcceptedSuggestion(entry))
    .filter((entry): entry is LocalWorkbenchAcceptedSuggestion => Boolean(entry));
}

async function writeAcceptedSuggestions(suggestions: LocalWorkbenchAcceptedSuggestion[]): Promise<void> {
  await writeJsonFile(resolveAcceptedSuggestionsPath(), {
    schemaVersion: 1,
    surfaceId: TARGET.id,
    updatedAt: new Date().toISOString(),
    suggestions,
  } satisfies AcceptedSuggestionBacklogFile);
}

function uniqueByContent<T extends { content: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.content.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function mergeActiveAstChange(
  current: LocalWorkbenchAstChange[],
  canonicalAst: UiAstDocument,
  sourceMessageId: string,
  createdAt: string,
  change: {
    path: LocalWorkbenchAstChange["path"];
    action: LocalWorkbenchAstChange["action"];
    value: string | number;
    summary: string;
  },
): Promise<LocalWorkbenchAstChange[]> {
  const canonicalSummary = await summarizeUiAstDocument(canonicalAst);
  const canonicalSurface = targetAstSurface(canonicalAst);
  const canonicalPlatform = targetAstWebPlatform(canonicalAst);
  const next = current.filter((entry) => {
    if (
      change.path === "color.allowedValues"
      || change.path === "surfaces[reference-target-web].platforms[web].allowedFonts"
      || change.path === "surfaces[reference-target-web].governance.roles.designers"
      || change.path === "surfaces[reference-target-web].governance.roles.engineers"
      || change.path === "surfaces[reference-target-web].runtime.mutationEnvelope.allowedSections"
    ) {
      return !(entry.path === change.path && String(entry.value) === String(change.value));
    }
    return entry.path !== change.path;
  });

  if (
    (change.path === "color.policy" && String(change.value) === canonicalSummary.colorPolicy)
    || (
      change.path === "surfaces[reference-target-web].platforms[web].layout.maxContentWidth"
      && Number(change.value) === canonicalSummary.maxContentWidth
    )
    || (
      change.path === "color.allowedValues"
      && canonicalSummary.allowedColors.includes(String(change.value))
    )
    || (
      change.path === "surfaces[reference-target-web].platforms[web].allowedFonts"
      && canonicalSummary.allowedFonts.includes(String(change.value))
    )
    || (
      change.path === "surfaces[reference-target-web].owner"
      && String(change.value) === canonicalSummary.owner
    )
    || (
      change.path === "surfaces[reference-target-web].governance.status"
      && String(change.value) === canonicalSummary.governanceStatus
    )
    || (
      change.path === "surfaces[reference-target-web].runtime.policy"
      && String(change.value) === canonicalSummary.runtimePolicy
    )
    || (
      change.path === "surfaces[reference-target-web].runtime.mutationEnvelope.mode"
      && String(change.value) === canonicalSummary.mutationMode
    )
    || (
      change.path === "surfaces[reference-target-web].governance.roles.designers"
      && (canonicalSurface?.governance?.roles?.designers ?? []).includes(String(change.value))
    )
    || (
      change.path === "surfaces[reference-target-web].governance.roles.engineers"
      && (canonicalSurface?.governance?.roles?.engineers ?? []).includes(String(change.value))
    )
    || (
      change.path === "surfaces[reference-target-web].runtime.mutationEnvelope.allowedSections"
      && (canonicalSurface?.runtime?.mutationEnvelope?.allowedSections ?? []).includes(String(change.value))
    )
    || (
      change.path === "surfaces[reference-target-web].platforms[web].allowedFonts"
      && (canonicalPlatform?.allowedFonts ?? []).includes(String(change.value))
    )
  ) {
    return next;
  }

  next.push({
    id: randomUUID(),
    path: change.path,
    action: change.action,
    value: change.value,
    summary: change.summary,
    createdAt,
    sourceMessageId,
  });
  return next;
}

async function applyWorkbenchAstChange(
  ast: UiAstDocument,
  change: {
    path: LocalWorkbenchAstChange["path"];
    action: LocalWorkbenchAstChange["action"];
    value: string | number;
    summary: string;
  },
): Promise<UiAstDocument> {
  return applyUiAstDocumentChange(ast, change);
}

function appendDesignerNotes(
  current: LocalWorkbenchDesignerNote[],
  notes: string[],
  sourceMessageId: string,
  createdAt: string,
): LocalWorkbenchDesignerNote[] {
  return uniqueByContent([
    ...current,
    ...notes.map((content) => ({
      id: randomUUID(),
      content,
      createdAt,
      sourceMessageId,
    })),
  ]);
}

function normalizeStoredChatMessage(
  entry: unknown,
  fallbackCreatedAt: string,
): LocalWorkbenchChatMessage | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const role = String(record.role ?? "");
  if (role !== "system" && role !== "assistant" && role !== "user") {
    return null;
  }

  const id = typeof record.id === "string" && record.id.trim() ? record.id.trim() : randomUUID();
  const title = typeof record.title === "string" && record.title.trim()
    ? record.title.trim()
    : role === "user"
      ? "Designer"
      : "UI AST shaper";
  const content = typeof record.content === "string" ? record.content : "";
  const createdAt = typeof record.createdAt === "string" && record.createdAt.trim()
    ? record.createdAt
    : fallbackCreatedAt;

  return {
    id,
    role,
    title,
    content,
    createdAt,
  };
}

async function replayLegacyContractSession(
  existing: Partial<UiAstSessionFile> & {
    schemaVersion?: number;
    canonicalContractPath?: string;
    workingContract?: LegacyContractDocument;
    activeContractChanges?: LocalWorkbenchAstChange[];
  },
): Promise<UiAstSessionFile> {
  const canonicalAstPath = existing.canonicalAstPath ?? resolveTargetAstPath();
  const canonicalAst =
    existing.canonicalContractPath && !(await fileExists(canonicalAstPath))
      ? await migrateLegacyContractDocument(
          await readJsonFile<LegacyContractDocument>(existing.canonicalContractPath),
        )
      : await loadCanonicalTargetAst();
  const fallbackTimestamp = existing.updatedAt ?? new Date().toISOString();
  const originalChat = (Array.isArray(existing.chat) ? existing.chat : [])
    .map((entry) => normalizeStoredChatMessage(entry, fallbackTimestamp))
    .filter((entry): entry is LocalWorkbenchChatMessage => Boolean(entry));

  let workingAst = existing.workingContract
    ? await migrateLegacyContractDocument(existing.workingContract)
    : cloneUiAst(canonicalAst);
  let activeAstChanges: LocalWorkbenchAstChange[] = [];
  let activeDesignerNotes: LocalWorkbenchDesignerNote[] = [];
  const nextChat: LocalWorkbenchChatMessage[] = [];
  let pendingAssistantMessage: LocalWorkbenchChatMessage | null = null;

  for (const message of originalChat) {
    if (message.role === "user") {
      nextChat.push(message);
      const result = await shapeLocalWorkbenchContract({
        config: resolveLocalLlmConfig(),
        message: message.content,
        astSummary: await uiAstSummaryText(workingAst),
        activeDesignerNotes,
      });

      for (const change of result.astChanges) {
        workingAst = await applyWorkbenchAstChange(workingAst, change);
        activeAstChanges = await mergeActiveAstChange(
          activeAstChanges,
          canonicalAst,
          message.id,
          message.createdAt,
          change,
        );
      }

      activeDesignerNotes = appendDesignerNotes(
        activeDesignerNotes,
        result.designerNotes,
        message.id,
        message.createdAt,
      );

      pendingAssistantMessage = {
        id: randomUUID(),
        role: "assistant",
        title: "UI AST shaper",
        content: result.assistantMessage,
        createdAt: message.createdAt,
      };
      continue;
    }

    if (message.role === "assistant" && pendingAssistantMessage) {
      nextChat.push({
        ...message,
        title: message.title || pendingAssistantMessage.title,
        content: pendingAssistantMessage.content,
      });
      pendingAssistantMessage = null;
      continue;
    }

    nextChat.push(message);
  }

  if (pendingAssistantMessage) {
    nextChat.push(pendingAssistantMessage);
  }

  return {
    schemaVersion: UI_AST_SESSION_SCHEMA_VERSION,
    surfaceId: TARGET.id,
    canonicalAstPath,
    updatedAt: new Date().toISOString(),
    workingAst,
    chat: nextChat,
    activeAstChanges,
    activeDesignerNotes,
  };
}

async function loadOrInitContractSession(): Promise<UiAstSessionFile> {
  const sessionPath = resolveContractSessionPath();
  if (await fileExists(sessionPath)) {
    const existing = await readJsonFile<
      Partial<UiAstSessionFile> & {
        schemaVersion?: number;
        canonicalContractPath?: string;
        workingContract?: LegacyContractDocument;
        activeContractChanges?: LocalWorkbenchAstChange[];
      }
    >(sessionPath);
    if (existing.schemaVersion === UI_AST_SESSION_SCHEMA_VERSION && existing.workingAst) {
      return {
        schemaVersion: UI_AST_SESSION_SCHEMA_VERSION,
        surfaceId: TARGET.id,
        canonicalAstPath: existing.canonicalAstPath ?? resolveTargetAstPath(),
        updatedAt: existing.updatedAt ?? new Date().toISOString(),
        workingAst: await normalizeUiAstDocument(
          existing.workingAst ?? await loadCanonicalTargetAst(),
        ),
        chat: (Array.isArray(existing.chat) ? existing.chat : [])
          .map((entry) => normalizeStoredChatMessage(entry, existing.updatedAt ?? new Date().toISOString()))
          .filter((entry): entry is LocalWorkbenchChatMessage => Boolean(entry)),
        activeAstChanges: Array.isArray(existing.activeAstChanges) ? existing.activeAstChanges : [],
        activeDesignerNotes: Array.isArray(existing.activeDesignerNotes) ? existing.activeDesignerNotes : [],
      };
    }

    const upgradedSession = await replayLegacyContractSession(existing);
    await writeContractSession(upgradedSession);
    return upgradedSession;
  }

  const canonicalAstPath = resolveTargetAstPath();
  const workingAst = await loadCanonicalTargetAst();
  const session = {
    schemaVersion: UI_AST_SESSION_SCHEMA_VERSION,
    surfaceId: TARGET.id,
    canonicalAstPath,
    updatedAt: new Date().toISOString(),
    workingAst,
    chat: [],
    activeAstChanges: [],
    activeDesignerNotes: [],
  } satisfies UiAstSessionFile;
  await writeJsonFile(sessionPath, session);
  return session;
}

async function writeContractSession(session: UiAstSessionFile): Promise<void> {
  await writeJsonFile(resolveContractSessionPath(), session);
}

function normalizeFindingCodes(validatePayload: Record<string, unknown>): string[] {
  const findings = Array.isArray(validatePayload.findings) ? validatePayload.findings : [];
  return findings
    .map((entry) => (entry && typeof entry === "object" ? String((entry as Record<string, unknown>).code ?? "") : ""))
    .filter(Boolean);
}

function blockingFindingCount(validatePayload: Record<string, unknown>): number {
  const findings = Array.isArray(validatePayload.findings) ? validatePayload.findings : [];
  return findings.filter((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const severity = String((entry as Record<string, unknown>).severity ?? "");
    return severity === "error";
  }).length;
}

export function pruneAcceptedSuggestions(
  acceptedSuggestions: LocalWorkbenchAcceptedSuggestion[],
  validatePayload: Record<string, unknown>,
): LocalWorkbenchAcceptedSuggestion[] {
  const findingCodes = new Set(normalizeFindingCodes(validatePayload));
  return acceptedSuggestions.filter((suggestion) => findingCodes.has(suggestion.findingCode));
}

export function unresolvedAcceptedSuggestionCodes(
  acceptedSuggestions: LocalWorkbenchAcceptedSuggestion[],
  validatePayload: Record<string, unknown>,
): string[] {
  const findingCodes = new Set(normalizeFindingCodes(validatePayload));
  return acceptedSuggestions
    .map((suggestion) => suggestion.findingCode)
    .filter((findingCode) => findingCodes.has(findingCode));
}

function buildAcceptedSuggestionFailureMessage(findingCodes: string[]): string {
  return `Local model reported noChanges=true but accepted suggestions remain unresolved: ${findingCodes.join(", ")}`;
}

export function buildEditedUnresolvedAcceptedSuggestionMessage(
  latestRun: LocalWorkbenchRun | null,
  acceptedSuggestions: LocalWorkbenchAcceptedSuggestion[],
): string | null {
  if (!latestRun || latestRun.status !== "succeeded" || latestRun.touchedFiles.length === 0 || acceptedSuggestions.length === 0) {
    return null;
  }
  const latestRunStartedAt = Date.parse(latestRun.createdAt);
  const eligibleAcceptedSuggestions = acceptedSuggestions.filter((suggestion) => {
    if (suggestion.sourceRunId === latestRun.runId) {
      return false;
    }
    const acceptedAt = Date.parse(suggestion.acceptedAt);
    if (!Number.isNaN(latestRunStartedAt) && !Number.isNaN(acceptedAt)) {
      return latestRunStartedAt >= acceptedAt;
    }
    return true;
  });
  if (eligibleAcceptedSuggestions.length === 0) {
    return null;
  }
  return eligibleAcceptedSuggestions
    .map((suggestion) => unresolvedExplanationForFinding(suggestion.findingCode) ?? `The last rerun changed files, but ${suggestion.findingCode} still remains unresolved.`)
    .join("\n\n");
}

export function unresolvedAcceptedSuggestionNoopErrorMessage(
  noChanges: boolean,
  acceptedSuggestions: LocalWorkbenchAcceptedSuggestion[],
  validatePayload: Record<string, unknown>,
): string | null {
  if (!noChanges) {
    return null;
  }
  const unresolvedFindingCodes = unresolvedAcceptedSuggestionCodes(acceptedSuggestions, validatePayload);
  if (unresolvedFindingCodes.length === 0) {
    return null;
  }
  return buildAcceptedSuggestionFailureMessage(unresolvedFindingCodes);
}

export function suggestionSummaryFromRun(
  preparedPayload: Record<string, unknown>,
  validatePayload: Record<string, unknown>,
  options: {
    reviewedPayload?: Record<string, unknown> | null;
    acceptedSuggestions?: LocalWorkbenchAcceptedSuggestion[];
    fixture?: BenchmarkFixture | null;
  } = {},
): LocalWorkbenchSuggestion[] {
  const repairMap = extractRepairEntries(preparedPayload.repairMap);
  const reviewedSuggestions = Array.isArray(options.reviewedPayload?.suggestions) ? options.reviewedPayload.suggestions : [];
  const reviewedBySuggestionId = new Map<string, Record<string, unknown>>();
  const reviewedByFindingCode = new Map<string, Record<string, unknown>>();
  for (const suggestion of reviewedSuggestions) {
    const reviewed = asRecord(suggestion);
    if (!reviewed) continue;
    const suggestionId = String(reviewed.suggestionId ?? "");
    const findingCode = String(reviewed.findingCode ?? "");
    if (suggestionId) reviewedBySuggestionId.set(suggestionId, reviewed);
    if (findingCode) reviewedByFindingCode.set(findingCode, reviewed);
  }
  const acceptedByFindingCode = new Map(
    (options.acceptedSuggestions ?? []).map((suggestion) => [suggestion.findingCode, suggestion] as const),
  );
  const findings = Array.isArray(validatePayload.findings) ? validatePayload.findings : [];
  return findings
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
    .map((finding, index) => {
      const code = String(finding.code ?? `finding-${index + 1}`);
      const location = asRecord(finding.location);
      const locationFile = typeof location?.file === "string" && location.file.trim() ? location.file.trim() : null;
      const repair = repairMap.find((entry) => entry.code === code) ?? null;
      const guidanceContext = options.fixture
        ? {
            appPath: options.fixture.appPath,
            guidanceHints: options.fixture.guidanceHints,
          } satisfies SuggestionGuidanceContext
        : null;
      const suggestionId = `suggestion-${index + 1}`;
      const reviewed = reviewedBySuggestionId.get(suggestionId) ?? reviewedByFindingCode.get(code);
      const accepted = acceptedByFindingCode.get(code);
      const reviewedSummary = typeof reviewed?.summary === "string" ? reviewed.summary : null;
      const reviewedPath = typeof reviewed?.suggestedPath === "string" ? reviewed.suggestedPath : null;
      const reviewedRationale = typeof reviewed?.rationale === "string" ? reviewed.rationale : null;
      const repairGuidance = resolveRepairGuidance({
        findingCode: code,
        findingMessage: String(finding.message ?? code),
        repair,
        locationFile,
        context: guidanceContext,
      });
      const repairSummary = repairGuidance.summary ?? (repair ? String(repair.summary ?? repair.code ?? code) : null);
      const repairPath = repairGuidance.suggestedPath ?? (repair ? String(repair.path ?? options.fixture?.appPath ?? TARGET.appPath) : null);
      const status = accepted
        ? "accepted"
        : (reviewed ? String(reviewed.status ?? "proposed") : "proposed") as LocalSuggestionStatus;
      return enrichSuggestionGuidance({
        suggestionId,
        findingCode: code,
        findingMessage: String(finding.message ?? code),
        summary: accepted?.summary ?? reviewedSummary ?? repairSummary ?? `Review and refine ${code}.`,
        suggestedPath: accepted?.suggestedPath ?? reviewedPath ?? repairPath ?? locationFile ?? options.fixture?.appPath ?? TARGET.appPath,
        status,
        ...((accepted?.rationale ?? reviewedRationale) ? { rationale: accepted?.rationale ?? reviewedRationale! } : {}),
      }, locationFile, guidanceContext);
    });
}

function buildComparison(
  baselineValidate: Record<string, unknown>,
  currentValidate: Record<string, unknown>,
): LocalWorkbenchComparison {
  const baselineCodes = normalizeFindingCodes(baselineValidate);
  const currentCodes = normalizeFindingCodes(currentValidate);
  return {
    baselineStatus: String(baselineValidate.status ?? "unknown"),
    currentStatus: String(currentValidate.status ?? "unknown"),
    baselineFindingCount: baselineCodes.length,
    currentFindingCount: currentCodes.length,
    baselineBlockingCount: blockingFindingCount(baselineValidate),
    currentBlockingCount: blockingFindingCount(currentValidate),
    findingCountDelta: currentCodes.length - baselineCodes.length,
    blockingCountDelta: blockingFindingCount(currentValidate) - blockingFindingCount(baselineValidate),
    newFindingCodes: currentCodes.filter((code) => !baselineCodes.includes(code)),
    resolvedFindingCodes: baselineCodes.filter((code) => !currentCodes.includes(code)),
  };
}

function toAcceptedSuggestion(
  suggestion: LocalWorkbenchSuggestion,
  sourceRunId: string,
  acceptedAt: string,
): LocalWorkbenchAcceptedSuggestion {
  return {
    findingCode: suggestion.findingCode,
    findingMessage: suggestion.findingMessage,
    summary: suggestion.summary,
    suggestedPath: suggestion.suggestedPath,
    sourceRunId,
    acceptedAt,
    ...(suggestion.rationale ? { rationale: suggestion.rationale } : {}),
  };
}

function mergeBenchmarkAcceptedSuggestions(input: {
  fixture: BenchmarkFixture;
  baselineSuggestions: LocalWorkbenchSuggestion[];
  profileAcceptedSuggestions: LocalWorkbenchAcceptedSuggestion[];
  sourceRunId: string;
  acceptedAt: string;
}): LocalWorkbenchAcceptedSuggestion[] {
  const guidanceContext = {
    appPath: input.fixture.appPath,
    guidanceHints: input.fixture.guidanceHints,
  } satisfies SuggestionGuidanceContext;
  const merged = new Map<string, LocalWorkbenchAcceptedSuggestion>();

  for (const suggestion of input.baselineSuggestions) {
    merged.set(
      suggestion.findingCode,
      toAcceptedSuggestion(suggestion, input.sourceRunId, input.acceptedAt),
    );
  }

  for (const suggestion of input.profileAcceptedSuggestions) {
    merged.set(
      suggestion.findingCode,
      enrichSuggestionGuidance({ ...suggestion }, null, guidanceContext),
    );
  }

  return [...merged.values()];
}

async function buildChatMessages(session: UiAstSessionFile): Promise<LocalWorkbenchChatMessage[]> {
  const summaryMessage = buildUiAstSummaryMessage(await uiAstSummaryText(session.workingAst));
  if (session.chat.length === 0) {
    return [
      summaryMessage,
      {
        id: "empty-chat",
        role: "assistant",
        title: "UI AST shaper",
        content: "Send a designer instruction to shape the working UI AST before the next rerun.",
        createdAt: session.updatedAt,
      },
    ];
  }

  return [summaryMessage, ...session.chat];
}

async function runCommand(
  command: string,
  args: string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    stdinText?: string;
  },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    if (options.stdinText) {
      child.stdin.write(options.stdinText);
    }
    child.stdin.end();
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `${command} exited with code ${code}.`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function linkDependencySource(source: string, target: string): Promise<void> {
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.rm(target, { recursive: true, force: true });
  await fsp.symlink(source, target, "junction");
}

async function mirrorSandboxNodeModules(sandboxRoot: string): Promise<void> {
  const rootNodeModules = resolveDependencySource("node_modules");
  if (rootNodeModules) {
    await linkDependencySource(rootNodeModules, path.join(sandboxRoot, "node_modules"));
  }
}

async function ensureSandboxPreviewDependencies(
  sandboxRoot: string,
  appPath: string = TARGET.appPath,
): Promise<void> {
  const relativePath = path.join(appPath, "node_modules");
  const source = resolveDependencySource(relativePath);
  if (!source) {
    return;
  }
  await linkDependencySource(source, path.join(sandboxRoot, appPath, "node_modules"));
}

async function syncWorkingTreeIntoSandbox(sourceRoot: string, sandboxRoot: string): Promise<void> {
  await runCommand(
    "rsync",
    [
      "-a",
      "--delete",
      "--exclude=.git",
      "--exclude=node_modules",
      "--exclude=.next",
      "--exclude=artifacts",
      "--exclude=.scratch",
      `${sourceRoot}/`,
      `${sandboxRoot}/`,
    ],
    { cwd: sourceRoot },
  );
}

async function createSandbox(
  runId: string,
  label: string,
  options: {
    includeWorkingTree?: boolean;
    sourceRoot?: string;
  } = {},
): Promise<string> {
  const sandboxRoot = path.join(resolveSandboxRoot(), runId, label);
  await fsp.mkdir(path.dirname(sandboxRoot), { recursive: true });
  await fsp.rm(sandboxRoot, { recursive: true, force: true });
  await runCommand("git", ["worktree", "add", "--detach", sandboxRoot, "HEAD"], {
    cwd: resolveWorkspaceRoot(),
  });
  await fsp.mkdir(sandboxRoot, { recursive: true });
  if (options.includeWorkingTree) {
    await syncWorkingTreeIntoSandbox(options.sourceRoot ?? resolveWorkspaceRoot(), sandboxRoot);
  }
  await mirrorSandboxNodeModules(sandboxRoot);
  return sandboxRoot;
}

async function removeSandbox(sandboxRoot: string): Promise<void> {
  await runCommand("git", ["worktree", "remove", "--force", sandboxRoot], {
    cwd: resolveWorkspaceRoot(),
  }).catch(async () => {
    await fsp.rm(sandboxRoot, { recursive: true, force: true });
  });
}

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        if (!address || typeof address === "string") {
          reject(new Error("Could not resolve an available port."));
          return;
        }
        resolve(address.port);
      });
    });
    server.on("error", reject);
  });
}

function formatProcessOutputTail(stdout: string, stderr: string, maxLines = 40): string {
  const combined = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
  if (!combined) {
    return "";
  }
  return combined.split(/\r?\n/).slice(-maxLines).join("\n");
}

function withServerOutput(message: string, server?: PreviewServerHandle, surfaceId: string = TARGET.id): string {
  const outputTail = server?.getOutputTail() ?? "";
  if (!outputTail) {
    return message;
  }
  return `${message}\n\n${surfaceId} logs:\n${outputTail}`;
}

function summarizeServerResponseBody(body: string, maxChars = 600): string {
  const normalized = body
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > maxChars ? `${normalized.slice(0, maxChars - 3)}...` : normalized;
}

export function fatalServerResponseMessage(
  url: string,
  status: number,
  body: string,
  surfaceId: string = TARGET.id,
): string | null {
  if (status < 500) {
    return null;
  }
  const excerpt = summarizeServerResponseBody(body);
  if (!excerpt) {
    return `${surfaceId} dev server returned HTTP ${status} for ${url}.`;
  }
  return `${surfaceId} dev server returned HTTP ${status} for ${url}: ${excerpt}`;
}

async function waitForUrl(url: string, server?: PreviewServerHandle, surfaceId: string = TARGET.id): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server?.child.exitCode !== null) {
      throw new Error(withServerOutput(`${surfaceId} dev server exited before ${url} became ready.`, server, surfaceId));
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      const fatalResponse = fatalServerResponseMessage(url, response.status, await response.text(), surfaceId);
      if (fatalResponse) {
        throw new Error(withServerOutput(fatalResponse, server, surfaceId));
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes(`${surfaceId} dev server returned HTTP`)) {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(withServerOutput(`Timed out waiting for ${url}.`, server, surfaceId));
}

async function startReferenceTargetServer(
  workspaceRoot: string,
  port: number,
  paths: { stdoutPath: string; stderrPath: string },
  fixture: BenchmarkFixture = REFERENCE_TARGET_FIXTURE,
): Promise<PreviewServerHandle> {
  await fsp.mkdir(path.dirname(paths.stdoutPath), { recursive: true });
  const stdoutStream = fs.createWriteStream(paths.stdoutPath, { flags: "w" });
  const stderrStream = fs.createWriteStream(paths.stderrPath, { flags: "w" });
  const child = spawn(
    "pnpm",
    ["exec", "next", "dev", "--port", String(port), "--hostname", "127.0.0.1", "--webpack"],
    {
      cwd: path.join(workspaceRoot, fixture.appPath),
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";
  let stderrTail: string[] = [];
  child.stdout?.on("data", (chunk) => {
    const text = String(chunk);
    stdout += text;
    stdoutStream.write(text);
  });
  child.stderr?.on("data", (chunk) => {
    const text = String(chunk);
    stderr += text;
    stderrStream.write(text);
    stderrTail = buildStderrTail(stderrTail, text);
  });
  child.on("exit", (code) => {
    stdoutStream.end();
    stderrStream.end();
    if (code && code !== 0) {
      process.stderr.write(
        `${fixture.id} dev server exited early (${code}): ${stderrTail.join("\n")}\n`,
      );
    }
  });
  const server = {
    child,
    url: `http://127.0.0.1:${port}`,
    stdoutPath: paths.stdoutPath,
    stderrPath: paths.stderrPath,
    getStderrTail: () => [...stderrTail],
    getOutputTail: () => formatProcessOutputTail(stdout, stderr),
  } satisfies PreviewServerHandle;
  await waitForUrl(server.url, server, fixture.id);
  return server;
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

export function buildAssessmentPayload(
  notes: string,
  touchedFiles: string[],
  heuristics?: Record<string, number | null | undefined>,
) {
  return {
    structure: "partial",
    components: "partial",
    boundary: "partial",
    visual: "partial",
    responsiveness: "partial",
    platformFit: "partial",
    notes,
    touchedFiles,
    ...(heuristics ? { heuristics } : {}),
  };
}

function countRecoverableToolErrors(transcript: LocalLlmTranscriptEntry[]): number {
  return transcript.filter((entry) =>
    entry.type === "tool" &&
    entry.payload &&
    typeof entry.payload === "object" &&
    "error" in entry.payload
  ).length;
}

function buildAttemptHeuristics(input: {
  transcript: LocalLlmTranscriptEntry[];
  noChanges: boolean;
  touchedFiles: string[];
  originalAcceptedSuggestions: LocalWorkbenchAcceptedSuggestion[];
  remainingAcceptedSuggestions: LocalWorkbenchAcceptedSuggestion[];
  resolvedFindingCodes: string[];
}): Record<string, number | null> {
  const unresolvedAcceptedSuggestionCount = input.remainingAcceptedSuggestions.length;
  const unresolvedAcceptedSuggestionRate = input.originalAcceptedSuggestions.length > 0
    ? unresolvedAcceptedSuggestionCount / input.originalAcceptedSuggestions.length
    : null;
  const resolvedFindingCount = input.resolvedFindingCodes.length;
  return {
    unresolvedAcceptedSuggestionCount,
    unresolvedAcceptedSuggestionRate,
    noChangesAfterEditFailureCount: input.noChanges && input.touchedFiles.length > 0 ? 1 : 0,
    recoverableToolErrorCount: countRecoverableToolErrors(input.transcript),
    touchedFilesPerResolvedFinding: resolvedFindingCount > 0
      ? input.touchedFiles.length / resolvedFindingCount
      : null,
  };
}
function extractTranscriptFromError(error: unknown): LocalLlmTranscriptEntry[] | null {
  const transcript = error && typeof error === "object" ? (error as { transcript?: unknown }).transcript : undefined;
  return Array.isArray(transcript) ? (transcript as LocalLlmTranscriptEntry[]) : null;
}

async function loadRunRecord(runId: string): Promise<RunRecordFile | null> {
  const recordPath = resolveRunRecordPath(runId);
  if (!(await fileExists(recordPath))) {
    return null;
  }
  return normalizeRunRecord(await readJsonFile<RunRecordFile>(recordPath));
}

async function listRunRecords(): Promise<RunRecordFile[]> {
  const runsDir = resolveRunsDirectory();
  await fsp.mkdir(runsDir, { recursive: true });
  const entries = await fsp.readdir(runsDir, { withFileTypes: true });
  const records = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => loadRunRecord(entry.name)),
  );
  return records
    .filter((entry): entry is RunRecordFile => Boolean(entry))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function loadPublishRecord(publishId: string): Promise<PublishRecordFile | null> {
  const publishPath = resolvePublishRecordPath(publishId);
  if (!(await fileExists(publishPath))) {
    return null;
  }
  return readJsonFile<PublishRecordFile>(publishPath);
}

async function listPublishRecords(): Promise<PublishRecordFile[]> {
  const publishesDir = resolvePublishesDirectory();
  await fsp.mkdir(publishesDir, { recursive: true });
  const entries = await fsp.readdir(publishesDir, { withFileTypes: true });
  const records = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => loadPublishRecord(entry.name)),
  );
  return records
    .filter((entry): entry is PublishRecordFile => Boolean(entry))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function buildPublishView(record: PublishRecordFile): Promise<LocalWorkbenchPublish> {
  const integrationEvidence = await summarizeIntegrationEvidence(
    record.integrationEvidencePath ?? null,
  );
  return {
    publishId: record.publishId,
    status: record.status,
    createdAt: record.createdAt,
    sourceRunId: record.sourceRunId,
    astPath: record.astPath ?? record.contractPath ?? "",
    bundleRoot: record.bundleRoot,
    manifestPath: record.manifestPath,
    generationPayloadPath: record.generationPayloadPath,
    runtimePayloadPath: record.runtimePayloadPath,
    lifecycleStage: record.promotionRecord?.lifecycleStage ?? "published",
    integrationEvidencePath: record.integrationEvidencePath ?? null,
    promotionRecordPath: record.promotionRecordPath ?? null,
    integrationEvidence,
    promotionReadinessPath: record.promotionReadinessPath ?? null,
    promotionReadiness: record.promotionReadiness ?? null,
  };
}

async function buildRunView(record: RunRecordFile): Promise<LocalWorkbenchRun> {
  const preparedPayload = record.preparedInputPath && await fileExists(record.preparedInputPath)
    ? await readJsonFile<Record<string, unknown>>(record.preparedInputPath)
    : null;
  const currentValidatePath = record.currentSessionDir
    ? path.join(record.currentSessionDir, "attempts", `${RERUN_ATTEMPT}.validate.json`)
    : null;
  const baselineValidatePath = record.baselineSessionDir
    ? path.join(record.baselineSessionDir, "attempts", `${RERUN_ATTEMPT}.validate.json`)
    : null;
  const currentValidate = currentValidatePath && await fileExists(currentValidatePath)
    ? await readJsonFile<Record<string, unknown>>(currentValidatePath)
    : null;
  const baselineValidate = baselineValidatePath && await fileExists(baselineValidatePath)
    ? await readJsonFile<Record<string, unknown>>(baselineValidatePath)
    : null;
  const reviewedSuggestions = record.suggestionsPath && await fileExists(record.suggestionsPath)
    ? await readJsonFile<Record<string, unknown>>(record.suggestionsPath)
    : null;
  const acceptedSuggestions = await loadAcceptedSuggestions();
  const suggestions = preparedPayload && currentValidate
    ? suggestionSummaryFromRun(preparedPayload, currentValidate, {
        reviewedPayload: reviewedSuggestions,
        acceptedSuggestions,
      })
    : [];

  return {
    runId: record.runId,
    status: record.status,
    createdAt: record.createdAt,
    completedAt: record.completedAt,
    latestRunLabel: `Run ${record.runId.slice(0, 8)}`,
    model: record.model ?? null,
    currentPhase: record.currentPhase ?? null,
    phaseHistory: record.phaseHistory ?? [],
    agentSummary: record.agentSummary ?? null,
    noChanges: Boolean(record.noChanges),
    toolCallCount: record.toolCallCount ?? 0,
    writeCount: record.writeCount ?? 0,
    lastToolName: record.lastToolName ?? null,
    lastError: record.lastError ?? null,
    transcriptPath: record.transcriptPath,
    touchedFiles: record.touchedFiles,
    errorMessage: record.errorMessage,
    effectiveAstPath: record.effectiveAstPath ?? record.effectiveContractPath ?? null,
    guidanceStrategy: record.guidanceStrategy,
    guidanceHandoffPath: record.guidanceHandoffPath,
    agentInputPath: record.agentInputPath,
    explainabilityPath: record.explainabilityPath,
    baselinePreview: {
      path: record.baselinePreviewPath,
      dataUrl: dataUrlForPng(record.baselinePreviewPath),
    },
    currentPreview: {
      path: record.currentPreviewPath,
      dataUrl: dataUrlForPng(record.currentPreviewPath),
    },
    baselineSummaryPath: record.baselineSummaryPath,
    currentSummaryPath: record.currentSummaryPath,
    suggestionsPath: record.suggestionsPath,
    comparison: baselineValidate && currentValidate ? buildComparison(baselineValidate, currentValidate) : null,
    suggestions,
  };
}

async function loadTranscript(transcriptPath: string | null): Promise<LocalWorkbenchRunDetail["transcript"]> {
  if (!transcriptPath || !(await fileExists(transcriptPath))) {
    return [];
  }
  const payload = await readJsonFile<unknown>(transcriptPath);
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload.filter((entry): entry is LocalWorkbenchRunDetail["transcript"][number] => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const candidate = entry as Record<string, unknown>;
    return typeof candidate.type === "string"
      && candidate.payload !== null
      && typeof candidate.payload === "object"
      && typeof candidate.createdAt === "string";
  });
}

function buildLastToolCall(transcript: LocalWorkbenchRunDetail["transcript"]): LocalWorkbenchRunDetail["lastToolCall"] {
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const entry = transcript[index];
    if (!entry) continue;
    const type = String(entry.type ?? "");
    if (type !== "tool" && type !== "finish") {
      continue;
    }
    const payload = entry.payload && typeof entry.payload === "object" ? entry.payload as Record<string, unknown> : {};
    return {
      name: typeof payload.name === "string" ? payload.name : type,
      args: payload.args && typeof payload.args === "object" && !Array.isArray(payload.args)
        ? payload.args as Record<string, unknown>
        : null,
      result: payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)
        ? payload.result as Record<string, unknown>
        : null,
    };
  }
  return null;
}

function buildRunDurationMs(run: LocalWorkbenchRun): number | null {
  const started = Date.parse(run.createdAt);
  if (!Number.isFinite(started)) {
    return null;
  }
  const completed = run.completedAt ? Date.parse(run.completedAt) : Date.now();
  if (!Number.isFinite(completed)) {
    return null;
  }
  return Math.max(0, completed - started);
}

export async function loadLocalWorkbenchRunDetail(runId: string): Promise<LocalWorkbenchRunDetail | null> {
  const record = await loadRunRecord(runId);
  if (!record) {
    return null;
  }
  const run = await buildRunView(record);
  const transcript = await loadTranscript(record.transcriptPath);
  return {
    run,
    transcript,
    durationMs: buildRunDurationMs(run),
    previewDebug: {
      baseline: {
        url: record.baselinePreviewUrl ?? null,
        stdoutPath: record.baselinePreviewStdoutPath ?? null,
        stderrPath: record.baselinePreviewStderrPath ?? null,
        stderrTail: record.baselinePreviewStderrTail ?? [],
      },
      current: {
        url: record.currentPreviewUrl ?? null,
        stdoutPath: record.currentPreviewStdoutPath ?? null,
        stderrPath: record.currentPreviewStderrPath ?? null,
        stderrTail: record.currentPreviewStderrTail ?? [],
      },
    },
    lastToolCall: buildLastToolCall(transcript),
  };
}

export async function loadLocalWorkbenchData(): Promise<LocalWorkbenchData> {
  const session = await loadOrInitContractSession();
  const canonicalAst = await readJsonFile<UiAstDocument>(session.canonicalAstPath);
  const ast = await summarizeUiAstDocument(session.workingAst);
  const records = await listRunRecords();
  const publishRecords = await listPublishRecords();
  const activeAcceptedSuggestions = await loadAcceptedSuggestions();
  const runs = await Promise.all(records.map((record) => buildRunView(record)));
  const publishes = await Promise.all(publishRecords.map((record) => buildPublishView(record)));
  const latestRun = runs[0] ?? null;
  const latestPublish = publishes[0] ?? null;
  const review = await buildReviewSummary(canonicalAst, session.workingAst);
  const lifecycle = await buildLifecycleSummary(session.workingAst, {
    ...(review.changeCount === 0 && latestPublish
      ? { publishedAt: latestPublish.createdAt }
      : {}),
  });
  const latestRunOperatorNote = buildEditedUnresolvedAcceptedSuggestionMessage(latestRun, activeAcceptedSuggestions);
  const latestRunAgentInput: LocalWorkbenchAgentInput = {
    path: latestRun?.agentInputPath ?? null,
    content: await readTextFile(latestRun?.agentInputPath ?? null),
  };
  const latestRunGuidanceHandoff: LocalWorkbenchAgentInput = {
    path: latestRun?.guidanceHandoffPath ?? null,
    content: await readTextFile(latestRun?.guidanceHandoffPath ?? null),
  };
  let promotionReadiness: PromotionReadinessReport | null = null;
  try {
    const contractSnapshotPath = resolveCurrentPromotionReadinessContractPath();
    await writeJsonFile(contractSnapshotPath, await deriveLegacyContractDocument(session.workingAst));
    promotionReadiness = await generatePromotionReadinessReport({
      contractPath: contractSnapshotPath,
      outputPath: resolveCurrentPromotionReadinessPath(),
      mode: "advisory",
      latestRunOperatorNote,
    });
  } catch {
    promotionReadiness = null;
  }
  return {
    enabled: true,
    runRoot: resolveSurfaceRoot(),
    target: {
      id: TARGET.id,
      label: TARGET.label,
      appRoot: resolveTargetAppPath(),
      astPath: resolveTargetAstPath(),
      implementationBrief: TARGET.implementationBrief,
    },
    ast,
    lifecycle,
    review,
    latestRun,
    runs,
    latestPublish,
    publishes,
    promotionReadiness,
    activeAcceptedSuggestions,
    latestRunOperatorNote,
    activeAstChanges: session.activeAstChanges,
    activeDesignerNotes: session.activeDesignerNotes,
    latestRunAgentInput,
    latestRunGuidanceHandoff,
    chat: await buildChatMessages(session),
    localModel: resolveLocalModelState(),
  };
}

export async function appendLocalWorkbenchChatMessage(input: { message: string }): Promise<void> {
  const trimmedMessage = input.message.trim();
  if (!trimmedMessage) {
    throw new Error("message must be non-empty.");
  }

  const now = new Date().toISOString();
  const sourceMessageId = randomUUID();
  const session = await loadOrInitContractSession();
  const canonicalAst = await readJsonFile<UiAstDocument>(session.canonicalAstPath);
  const result = await shapeLocalWorkbenchContract({
    config: resolveLocalLlmConfig(),
    message: trimmedMessage,
    astSummary: await uiAstSummaryText(session.workingAst),
    activeDesignerNotes: session.activeDesignerNotes,
  });

  let nextAst = cloneUiAst(session.workingAst);
  let nextActiveAstChanges = [...session.activeAstChanges];
  for (const change of result.astChanges) {
    nextAst = await applyWorkbenchAstChange(nextAst, change);
    nextActiveAstChanges = await mergeActiveAstChange(
      nextActiveAstChanges,
      canonicalAst,
      sourceMessageId,
      now,
      change,
    );
  }

  const nextSession = {
    ...session,
    updatedAt: now,
    workingAst: nextAst,
    chat: [
      ...session.chat,
      {
        id: sourceMessageId,
        role: "user",
        title: "Designer",
        content: trimmedMessage,
        createdAt: now,
      },
      {
        id: randomUUID(),
        role: "assistant",
        title: "UI AST shaper",
        content: result.assistantMessage,
        createdAt: now,
      },
    ],
    activeAstChanges: nextActiveAstChanges,
    activeDesignerNotes: appendDesignerNotes(session.activeDesignerNotes, result.designerNotes, sourceMessageId, now),
  } satisfies UiAstSessionFile;

  await writeContractSession(nextSession);
}

export async function publishLocalWorkbenchContract(): Promise<LocalWorkbenchPublish> {
  const session = await loadOrInitContractSession();
  const records = await listRunRecords();
  const latestRun = records[0] ? await buildRunView(records[0]) : null;
  const activeAcceptedSuggestions = await loadAcceptedSuggestions();
  const latestRunOperatorNote = buildEditedUnresolvedAcceptedSuggestionMessage(latestRun, activeAcceptedSuggestions);

  const publishId = buildRunId();
  const publishDir = resolvePublishDirectory(publishId);
  const astPath = path.join(publishDir, "published-ui-ast.json");
  const promotionReadinessContractPath = path.join(publishDir, "promotion-readiness.contract.json");
  const bundleRoot = path.join(publishDir, "bundle");
  const generationPayloadPath = path.join(publishDir, "generation.json");
  const runtimePayloadPath = path.join(publishDir, "runtime.json");
  const integrationEvidencePath = path.join(publishDir, "integration-evidence.json");
  const promotionRecordPath = path.join(publishDir, "promotion-record.json");
  const promotionReadinessPath = path.join(publishDir, "promotion-readiness.json");
  const manifestPath = path.join(bundleRoot, "manifest.json");
  const createdAt = new Date().toISOString();

  await fsp.mkdir(publishDir, { recursive: true });
  await writeJsonFile(astPath, session.workingAst);
  await writeJsonFile(promotionReadinessContractPath, await deriveLegacyContractDocument(session.workingAst));
  const promotionReadiness = await generatePromotionReadinessReport({
    contractPath: promotionReadinessContractPath,
    outputPath: promotionReadinessPath,
    mode: "block",
    latestRunOperatorNote,
  });
  if (!promotionReadiness.summary.readyForPromotion) {
    throw new Error(
      firstPromotionReadinessBlocker(promotionReadiness) ??
      "Publish is blocked until promotion readiness checks pass.",
    );
  }
  await runInterfacectlCli(
    ["compile", "--ast", astPath, "--out", bundleRoot],
    { cwd: resolveWorkspaceRoot() },
  );
  await runInterfacectlCli(
    ["prepare-generation", "--bundle-root", bundleRoot, "--surface", TARGET.id, "--out", generationPayloadPath],
    { cwd: resolveWorkspaceRoot() },
  );
  await runInterfacectlCli(
    ["prepare-runtime", "--bundle-root", bundleRoot, "--surface", TARGET.id, "--out", runtimePayloadPath],
    { cwd: resolveWorkspaceRoot() },
  );

  const tools = await loadInterfacectlUiAstTools();
  const integrationContractDocument = await readJsonFile<{ integration?: unknown } | Record<string, unknown>>(
    path.join(bundleRoot, "surfaces", TARGET.id, "integration.json"),
  );
  const integrationContract =
    "integration" in integrationContractDocument
      ? integrationContractDocument.integration
      : integrationContractDocument;
  const manifest = await readJsonFile<{ bundleVersion?: unknown }>(manifestPath);
  const bundleVersion =
    typeof manifest.bundleVersion === "string" && manifest.bundleVersion.trim()
      ? manifest.bundleVersion
      : "3.0";
  const sourceRunId =
    promotionReadinessSurface(promotionReadiness)?.sourceKpis.find((entry) => entry.source === "generation")?.latestRun?.runId ??
    latestRun?.runId ??
    null;
  const lifecycle = tools.buildUiAstLifecycleRecord(session.workingAst, {
    surfaceId: TARGET.id,
    validationStatus: "passed",
    publishedAt: createdAt,
  }) as InterfacectlUiAstLifecycleRecord;
  const integrationEvidence = tools.buildUiAstIntegrationEvidence({
    contract: integrationContract,
    consumer: "surfaceops-workbench",
    platform: "web",
    bundleVersion,
    integratedAt: createdAt,
  }) as InterfacectlUiAstIntegrationEvidence;
  const promotionRecord = tools.buildUiAstPromotionRecord({
    promotionId: publishId,
    promotedAt: createdAt,
    ast: session.workingAst,
    surfaceId: TARGET.id,
    lifecycle,
    sourceRunId,
    astPath,
    bundleRoot,
    generationPayloadPath,
    runtimePayloadPath,
    integrationEvidencePath,
  }) as InterfacectlUiAstPromotionRecord;
  await writeJsonFile(integrationEvidencePath, integrationEvidence);
  await writeJsonFile(promotionRecordPath, promotionRecord);

  const publishRecord = {
    schemaVersion: 2,
    publishId,
    status: "published",
    createdAt,
    sourceRunId,
    astPath,
    bundleRoot,
    manifestPath,
    generationPayloadPath,
    runtimePayloadPath,
    integrationEvidencePath,
    integrationEvidence,
    promotionRecordPath,
    promotionRecord,
    promotionReadinessPath,
    promotionReadiness,
  } satisfies PublishRecordFile;
  await writeJsonFile(resolvePublishRecordPath(publishId), publishRecord);
  return buildPublishView(publishRecord);
}

async function updateRunRecord(runId: string, update: Partial<RunRecordFile>): Promise<void> {
  const existing = await loadRunRecord(runId);
  if (!existing) {
    throw new Error(`Run ${runId} not found.`);
  }
  await writeJsonFile(resolveRunRecordPath(runId), normalizeRunRecord({ ...existing, ...update }));
}

async function mutateRunRecord(
  runId: string,
  update: (record: RunRecordFile) => RunRecordFile,
): Promise<RunRecordFile> {
  const existing = await loadRunRecord(runId);
  if (!existing) {
    throw new Error(`Run ${runId} not found.`);
  }
  const next = normalizeRunRecord(update(existing));
  await writeJsonFile(resolveRunRecordPath(runId), next);
  return next;
}

async function startRunPhase(runId: string, phase: LocalWorkbenchRunPhase, message?: string): Promise<void> {
  await mutateRunRecord(runId, (record) => ({
    ...record,
    currentPhase: phase,
    phaseHistory: withRunPhaseMessage(record.phaseHistory ?? [], phase, "running", message ?? null),
  }));
}

async function completeRunPhase(runId: string, phase: LocalWorkbenchRunPhase, message?: string): Promise<void> {
  await mutateRunRecord(runId, (record) => ({
    ...record,
    currentPhase: phase,
    phaseHistory: withRunPhaseMessage(record.phaseHistory ?? [], phase, "succeeded", message ?? null),
  }));
}

async function failRunPhase(runId: string, phase: LocalWorkbenchRunPhase, message: string): Promise<void> {
  await mutateRunRecord(runId, (record) => ({
    ...record,
    currentPhase: phase,
    phaseHistory: withRunPhaseMessage(record.phaseHistory ?? [], phase, "failed", message),
    lastError: { phase, message },
    errorMessage: message,
  }));
}

async function writeRunExplainability(input: {
  runId: string;
  explainabilityPath: string;
  effectiveAstPath: string | null;
  agentInputPath: string | null;
  guidanceStrategy: string | null;
  guidanceHandoffPath: string | null;
  activeAstChanges: LocalWorkbenchAstChange[];
  activeDesignerNotes: LocalWorkbenchDesignerNote[];
}): Promise<void> {
  await writeJsonFile(input.explainabilityPath, {
    schemaVersion: 3,
    runId: input.runId,
    createdAt: new Date().toISOString(),
    effectiveAstPath: input.effectiveAstPath,
    agentInputPath: input.agentInputPath,
    guidanceStrategy: input.guidanceStrategy,
    guidanceHandoffPath: input.guidanceHandoffPath,
    activeAstChanges: input.activeAstChanges,
    activeDesignerNotes: input.activeDesignerNotes,
  } satisfies RunExplainabilityFile);
}

function buildRunId(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function sha256String(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildLocalModelFingerprint(config: LocalLlmConfig): string {
  return sha256String(JSON.stringify({
    baseUrl: config.baseUrl,
    model: config.model,
  }));
}

function buildResolvedModelFingerprint(baseUrl: string, resolvedModelId: string | null): string | null {
  if (!resolvedModelId) {
    return null;
  }
  return sha256String(JSON.stringify({
    baseUrl,
    model: resolvedModelId,
  }));
}

function normalizeBenchmarkStrategies(
  strategies: ImplementationGuidanceStrategy[] | undefined,
  defaultStrategies: ImplementationGuidanceStrategy[],
): ImplementationGuidanceStrategy[] {
  const source = strategies?.length ? strategies : defaultStrategies;
  const unique = [...new Set(source)];
  const allowed = unique.filter((entry): entry is ImplementationGuidanceStrategy =>
    entry === "prompt-summary" || entry === "baseline-primary" || entry === "json-primary" || entry === "unguided",
  );

  if (allowed.length !== unique.length) {
    throw new Error("Benchmark cohorts only support prompt-summary, baseline-primary, json-primary, and unguided.");
  }
  if (!allowed.includes("baseline-primary") || !allowed.includes("json-primary")) {
    throw new Error("Benchmark cohorts must include baseline-primary and json-primary.");
  }
  if (allowed.length < 2) {
    throw new Error("Benchmark cohorts require at least two guidance strategies.");
  }

  const ordered: ImplementationGuidanceStrategy[] = [];
  if (allowed.includes("unguided")) {
    ordered.push("unguided");
  }
  if (allowed.includes("prompt-summary")) {
    ordered.push("prompt-summary");
  }
  ordered.push("baseline-primary", "json-primary");
  return ordered.filter((entry, index, values) => allowed.includes(entry) && values.indexOf(entry) === index);
}

function buildBenchmarkComparisonPairs(
  strategies: ImplementationGuidanceStrategy[],
): BenchmarkComparisonPair[] {
  const normalized = normalizeBenchmarkStrategies(strategies, REFERENCE_TARGET_BENCHMARK_PROFILE.defaultStrategies);
  if (normalized.length === 2) {
    return [{
      baselineGuidanceStrategy: normalized[0],
      guidedGuidanceStrategy: normalized[1],
    }];
  }
  const pairs: BenchmarkComparisonPair[] = [];
  if (normalized.includes("unguided") && normalized.includes("baseline-primary")) {
    pairs.push({
      baselineGuidanceStrategy: "unguided",
      guidedGuidanceStrategy: "baseline-primary",
    });
  }
  if (normalized.includes("unguided") && normalized.includes("json-primary")) {
    pairs.push({
      baselineGuidanceStrategy: "unguided",
      guidedGuidanceStrategy: "json-primary",
    });
  }
  if (normalized.includes("baseline-primary") && normalized.includes("json-primary")) {
    pairs.push({
      baselineGuidanceStrategy: "baseline-primary",
      guidedGuidanceStrategy: "json-primary",
    });
  }
  if (normalized.includes("prompt-summary") && normalized.includes("json-primary")) {
    pairs.push({
      baselineGuidanceStrategy: "prompt-summary",
      guidedGuidanceStrategy: "json-primary",
    });
  }
  if (normalized.includes("prompt-summary") && normalized.includes("baseline-primary")) {
    pairs.push({
      baselineGuidanceStrategy: "prompt-summary",
      guidedGuidanceStrategy: "baseline-primary",
    });
  }
  return pairs;
}

export function buildReferenceTargetBenchmarkComparisonPairs(
  strategies: ImplementationGuidanceStrategy[],
): BenchmarkComparisonPair[] {
  return buildBenchmarkComparisonPairs(strategies);
}

async function writeFrozenTextFile(filePath: string, content: string): Promise<{ path: string; sha256: string }> {
  const normalized = `${content.trim()}\n`;
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, normalized, "utf8");
  return {
    path: filePath,
    sha256: sha256String(normalized),
  };
}

async function writeFrozenRuntimeGuidancePaths(
  runDir: string,
  acceptedSuggestions: LocalWorkbenchAcceptedSuggestion[],
  designerNotes: LocalWorkbenchDesignerNote[],
): Promise<FrozenRuntimeGuidancePaths> {
  const acceptedSuggestionsPath = path.join(runDir, "accepted-suggestions.runtime.json");
  const designerNotesPath = path.join(runDir, "designer-notes.runtime.json");
  await writeJsonFile(acceptedSuggestionsPath, {
    suggestions: acceptedSuggestions.map((suggestion) => ({
      findingCode: suggestion.findingCode,
      findingMessage: suggestion.findingMessage,
      summary: suggestion.summary,
      suggestedPath: suggestion.suggestedPath,
      sourceRunId: suggestion.sourceRunId,
      acceptedAt: suggestion.acceptedAt,
      ...(suggestion.rationale ? { rationale: suggestion.rationale } : {}),
    })),
  });
  await writeJsonFile(designerNotesPath, {
    designerNotes: designerNotes.map((note) => note.content),
  });
  return {
    acceptedSuggestionsPath,
    designerNotesPath,
  };
}

function defaultCapturePresetForConsumerType(consumerType: BenchmarkConsumerType): string {
  switch (consumerType) {
    case "desktop-shell":
      return "desktop-shell";
    case "ios-native":
      return "ios-native";
    case "android-native":
      return "android-native";
    case "web-browser":
    default:
      return "web-browser";
  }
}

function defaultRequestedModelLabel(resolvedModelId: string | null): string | null {
  if (!resolvedModelId) {
    return null;
  }
  const trimmed = resolvedModelId.trim();
  if (!trimmed) {
    return null;
  }
  const segments = trimmed.split("/");
  return segments[segments.length - 1] || trimmed;
}

function buildBenchmarkSpecFixture(input: {
  fixture: BenchmarkFixture;
  brief: { path: string; sha256: string };
  comparisonPairs: BenchmarkComparisonPair[];
  platformTarget: BenchmarkPlatformTarget;
  consumerType: BenchmarkConsumerType;
  capturePreset: string;
  fixtureDir?: string;
  effectiveAstPath?: string;
  preparedInputPath?: string;
  acceptedSuggestionsPath?: string;
  designerNotesPath?: string;
  baselineValidatePath?: string;
}): BenchmarkSpecFixture {
  return {
    fixtureId: input.fixture.id,
    surfaceId: input.fixture.id,
    brief: input.brief,
    platformTarget: input.platformTarget,
    consumerType: input.consumerType,
    capturePreset: input.capturePreset,
    comparisonPairs: input.comparisonPairs.map((pair) => ({ ...pair })),
    paths: {
      ...(input.fixtureDir ? { fixtureDir: input.fixtureDir } : {}),
      sourceContractPath: path.join(resolveWorkspaceRoot(), input.fixture.contractPath),
      ...(input.fixture.astPath ? { sourceAstPath: path.join(resolveWorkspaceRoot(), input.fixture.astPath) } : {}),
      ...(input.effectiveAstPath ? { effectiveAstPath: input.effectiveAstPath } : {}),
      ...(input.fixtureDir ? { bundleRoot: path.join(input.fixtureDir, "bundle") } : {}),
      ...(input.fixtureDir ? { compiledContractPath: path.join(input.fixtureDir, "bundle", "derived", "contract.normalized.json") } : {}),
      ...(input.preparedInputPath ? { preparedInputPath: input.preparedInputPath } : {}),
      ...(input.acceptedSuggestionsPath ? { acceptedSuggestionsPath: input.acceptedSuggestionsPath } : {}),
      ...(input.designerNotesPath ? { designerNotesPath: input.designerNotesPath } : {}),
      ...(input.baselineValidatePath ? { baselineValidatePath: input.baselineValidatePath } : {}),
    },
  };
}

async function initializeBenchmarkRunManifest(input: {
  benchmarkDir: string;
  specPath: string;
  cohortId: string;
  tool: "local-llm";
  sourceRunPath?: string;
  requestedModelLabel?: string;
  resolvedModelId?: string | null;
  baseUrl?: string | null;
  fingerprint?: string | null;
}): Promise<BenchmarkRunManifest> {
  await runInterfacectlCli(
    [
      "replay-generation-benchmark",
      "--spec",
      input.specPath,
      "--tool",
      input.tool,
      "--out-dir",
      input.benchmarkDir,
      "--cohort-id",
      input.cohortId,
      ...(input.sourceRunPath ? ["--source-run", input.sourceRunPath] : []),
      ...(input.requestedModelLabel ? ["--requested-model-label", input.requestedModelLabel] : []),
      ...(input.resolvedModelId ? ["--resolved-model-id", input.resolvedModelId] : []),
      ...(input.baseUrl ? ["--base-url", input.baseUrl] : []),
      ...(input.fingerprint ? ["--fingerprint", input.fingerprint] : []),
    ],
    { cwd: resolveWorkspaceRoot() },
  );
  return readJsonFile<BenchmarkRunManifest>(path.join(input.benchmarkDir, "run.json"));
}

async function initReferenceTargetGenerationSession(input: {
  fixture: BenchmarkFixture;
  bundleRoot: string;
  sessionsRoot: string;
  sandboxRoot: string;
  sessionId: string;
  guidanceStrategy: ImplementationGuidanceStrategy;
  briefFile: string;
}): Promise<string> {
  await runInterfacectlCli(
    [
      "init-generation-session",
      "--bundle-root",
      input.bundleRoot,
      "--surface",
      input.fixture.id,
      "--workspace-root",
      input.sandboxRoot,
      "--tool",
      "local-llm",
      "--guidance-strategy",
      input.guidanceStrategy,
      "--brief-file",
      input.briefFile,
      "--session",
      input.sessionId,
      "--artifacts-root",
      input.sessionsRoot,
    ],
    { cwd: input.sandboxRoot },
  );
  return path.join(input.sessionsRoot, input.fixture.id, input.sessionId);
}

async function recordReferenceTargetAttemptAndPreview(input: {
  fixture: BenchmarkFixture;
  sandboxRoot: string;
  sessionDir: string;
  assessmentPath: string;
  summarizeAfterCapture?: boolean;
}): Promise<void> {
  const port = await getAvailablePort();
  await ensureSandboxPreviewDependencies(input.sandboxRoot, input.fixture.appPath);
  const previewLogDir = path.dirname(input.assessmentPath);
  const server = await startReferenceTargetServer(input.sandboxRoot, port, {
    stdoutPath: path.join(previewLogDir, "preview.stdout.log"),
    stderrPath: path.join(previewLogDir, "preview.stderr.log"),
  }, input.fixture);
  try {
    await runInterfacectlCli(
      ["record-generation-attempt", "--session-dir", input.sessionDir, "--assessment-file", input.assessmentPath],
      { cwd: input.sandboxRoot },
    );
    await runInterfacectlCli(
      [
        "capture-generation-preview",
        "--session-dir",
        input.sessionDir,
        "--attempt",
        "1",
        "--url",
        server.url,
      ],
      { cwd: input.sandboxRoot },
    );
    if (input.summarizeAfterCapture) {
      await runInterfacectlCli(
        ["summarize-generation-session", "--session-dir", input.sessionDir],
        { cwd: input.sandboxRoot, acceptExitCodes: [30] },
      );
    }
  } catch (error) {
    throw new Error(withServerOutput(error instanceof Error ? error.message : String(error), server, input.fixture.id));
  } finally {
    await stopServer(server.child);
  }
}

async function collectReferenceTargetBenchmarkBaselineValidate(input: {
  fixture: BenchmarkFixture;
  runId: string;
  artifactBaseDir: string;
  sessionsRoot: string;
  bundleRoot: string;
  briefFile: string;
}): Promise<Record<string, unknown>> {
  const sandboxRoot = await createSandbox(input.runId, `benchmark-baseline-seed-${input.fixture.id}`, {
    includeWorkingTree: true,
  });
  try {
    const sessionDir = await initReferenceTargetGenerationSession({
      fixture: input.fixture,
      bundleRoot: input.bundleRoot,
      sessionsRoot: input.sessionsRoot,
      sandboxRoot,
      sessionId: `${input.runId}/baseline-seed`,
      guidanceStrategy: "unguided",
      briefFile: input.briefFile,
    });
    await fsp.mkdir(input.artifactBaseDir, { recursive: true });
    const assessmentPath = path.join(input.artifactBaseDir, "attempt.assessment.json");
    await writeJsonFile(
      assessmentPath,
      buildAssessmentPayload("Baseline snapshot before benchmark repair guidance.", []),
    );
    await runInterfacectlCli(
      ["record-generation-attempt", "--session-dir", sessionDir, "--assessment-file", assessmentPath],
      { cwd: sandboxRoot },
    );
    const validatePath = path.join(sessionDir, "attempts", `${RERUN_ATTEMPT}.validate.json`);
    const validate = await readJsonFile<Record<string, unknown>>(validatePath);
    await writeJsonFile(path.join(input.artifactBaseDir, "attempt.validate.json"), validate);
    return validate;
  } finally {
    await removeSandbox(sandboxRoot).catch(() => undefined);
  }
}

async function runReferenceTargetImplementationSession(input: {
  fixture: BenchmarkFixture;
  llm: LocalLlmConfig;
  runId: string;
  artifactBaseDir: string;
  sessionsRoot: string;
  bundleRoot: string;
  preparedPayload: Record<string, unknown>;
  effectiveAstPath: string;
  effectiveAst: UiAstDocument;
  implementationBrief: string;
  guidanceStrategy: ImplementationGuidanceStrategy;
  briefFile: string;
  sessionId: string;
  sandboxLabel: string;
  runtimeGuidancePaths: FrozenRuntimeGuidancePaths;
  runtimeGuidance: {
    acceptedSuggestions: LocalWorkbenchAcceptedSuggestion[];
    designerNotes: LocalWorkbenchDesignerNote[];
  };
  activeAstChanges: LocalWorkbenchAstChange[];
  baselineValidate?: Record<string, unknown> | null;
  agentBudgets?: LocalLlmAgentBudgets;
}): Promise<ReferenceTargetImplementationSessionResult> {
  const transcriptPath = path.join(input.artifactBaseDir, "agent-trace.json");
  const guidanceHandoffPath = path.join(input.artifactBaseDir, "guidance-handoff.json");
  const agentInputPath = path.join(input.artifactBaseDir, "agent-input.txt");
  const explainabilityPath = path.join(input.artifactBaseDir, "explainability.json");
  const assessmentPath = path.join(input.artifactBaseDir, "attempt.assessment.json");
  await fsp.mkdir(input.artifactBaseDir, { recursive: true });

  const sandboxRoot = await createSandbox(input.runId, input.sandboxLabel, {
    includeWorkingTree: true,
  });
  try {
    const sessionDir = await initReferenceTargetGenerationSession({
      fixture: input.fixture,
      bundleRoot: input.bundleRoot,
      sessionsRoot: input.sessionsRoot,
      sandboxRoot,
      sessionId: input.sessionId,
      guidanceStrategy: input.guidanceStrategy,
      briefFile: input.briefFile,
    });

    await runInterfacectlCli(
      [
        "prepare-generation-handoff",
        "--session-dir",
        sessionDir,
        "--guidance-strategy",
        input.guidanceStrategy,
        "--accepted-suggestions",
        input.runtimeGuidancePaths.acceptedSuggestionsPath,
        "--designer-notes",
        input.runtimeGuidancePaths.designerNotesPath,
        "--out",
        guidanceHandoffPath,
      ],
      { cwd: sandboxRoot },
    );
    const guidanceHandoff = await readJsonFile<Record<string, unknown>>(guidanceHandoffPath);

    const agentResult = await runLocalLlmAgent({
      config: input.llm,
      repoRoot: sandboxRoot,
      allowedRoots: [input.fixture.appPath],
      surfaceId: input.fixture.id,
      guidanceHints: input.fixture.guidanceHints,
      guidanceStrategy: input.guidanceStrategy,
      guidanceHandoff,
      preparedPayload: input.preparedPayload,
      implementationBrief: input.implementationBrief,
      acceptedSuggestions: input.runtimeGuidance.acceptedSuggestions,
      effectiveAstSummary: await uiAstSummaryText(input.effectiveAst),
      activeDesignerNotes: input.runtimeGuidance.designerNotes,
      maxTurns: input.agentBudgets?.maxTurns,
      maxToolCalls: input.agentBudgets?.maxToolCalls,
      maxWallTimeMs: input.agentBudgets?.maxWallTimeMs,
    }).catch(async (error) => {
      const transcript = extractTranscriptFromError(error);
      if (transcript) {
        await writeJsonFile(transcriptPath, transcript);
      }
      throw error;
    });
    await writeJsonFile(transcriptPath, agentResult.transcript);
    await fsp.writeFile(agentInputPath, agentResult.agentInput, "utf8");
    await writeRunExplainability({
      runId: input.runId,
      explainabilityPath,
      effectiveAstPath: input.effectiveAstPath,
      agentInputPath,
      guidanceStrategy: input.guidanceStrategy,
      guidanceHandoffPath,
      activeAstChanges: input.activeAstChanges,
      activeDesignerNotes: input.runtimeGuidance.designerNotes,
    });

    const assessmentNotes = agentResult.noChanges
      ? "Current snapshot after local LLM reported no-op."
      : "Current snapshot after local LLM implementation pass.";
    await writeJsonFile(
      assessmentPath,
      buildAssessmentPayload(assessmentNotes, agentResult.touchedFiles),
    );
    await recordReferenceTargetAttemptAndPreview({
      fixture: input.fixture,
      sandboxRoot,
      sessionDir,
      assessmentPath,
      summarizeAfterCapture: false,
    });

    const validate = await readJsonFile<Record<string, unknown>>(
      path.join(sessionDir, "attempts", `${RERUN_ATTEMPT}.validate.json`),
    );
    const comparison = input.baselineValidate ? buildComparison(input.baselineValidate, validate) : null;
    const remainingAcceptedSuggestions = pruneAcceptedSuggestions(input.runtimeGuidance.acceptedSuggestions, validate);
    const assessmentPayload = buildAssessmentPayload(
      assessmentNotes,
      agentResult.touchedFiles,
      buildAttemptHeuristics({
        transcript: agentResult.transcript,
        noChanges: agentResult.noChanges,
        touchedFiles: agentResult.touchedFiles,
        originalAcceptedSuggestions: input.runtimeGuidance.acceptedSuggestions,
        remainingAcceptedSuggestions,
        resolvedFindingCodes: comparison?.resolvedFindingCodes ?? [],
      }),
    );
    const attemptAssessmentPath = path.join(sessionDir, "attempts", `${RERUN_ATTEMPT}.assessment.json`);
    await writeJsonFile(assessmentPath, assessmentPayload);
    await writeJsonFile(attemptAssessmentPath, assessmentPayload);
    await runInterfacectlCli(
      ["summarize-generation-session", "--session-dir", sessionDir],
      { cwd: sandboxRoot, acceptExitCodes: [30] },
    );

    return {
      guidanceStrategy: input.guidanceStrategy,
      sessionId: input.sessionId,
      sessionDir,
      transcriptPath,
      guidanceHandoffPath,
      agentInputPath,
      explainabilityPath,
      summaryPath: path.join(sessionDir, "summary.json"),
      previewPath: path.join(sessionDir, "attempts", `${RERUN_ATTEMPT}.preview.png`),
      touchedFiles: agentResult.touchedFiles,
      noChanges: agentResult.noChanges,
      validate,
      comparison,
      remainingAcceptedSuggestions,
    };
  } finally {
    await removeSandbox(sandboxRoot).catch(() => undefined);
  }
}

export async function startLocalWorkbenchRerun(): Promise<StartLocalRerunResult> {
  const llm = resolveLocalLlmConfig();
  const session = await loadOrInitContractSession();
  const activeAcceptedSuggestions = await loadAcceptedSuggestions();

  const runId = buildRunId();
  const runCreatedAt = new Date().toISOString();
  const runDir = resolveRunDirectory(runId);
  const bundleRoot = path.join(runDir, "bundle");
  const preparedPath = path.join(runDir, "prepared-input.json");
  const sessionsRoot = path.join(runDir, "sessions");
  const transcriptPath = path.join(runDir, "agent-trace.json");
  const effectiveAstPath = path.join(runDir, "effective-ui-ast.json");
  const agentInputPath = path.join(runDir, "agent-input.txt");
  const explainabilityPath = path.join(runDir, "explainability.json");

  await fsp.mkdir(runDir, { recursive: true });
  await writeJsonFile(effectiveAstPath, session.workingAst);
  await writeJsonFile(resolveRunRecordPath(runId), {
    schemaVersion: 3,
    runId,
    status: "running",
    createdAt: runCreatedAt,
    completedAt: null,
    model: llm.model,
    currentPhase: null,
    phaseHistory: [],
    agentSummary: null,
    noChanges: false,
    toolCallCount: 0,
    writeCount: 0,
    lastToolName: null,
    lastError: null,
    preparedInputPath: preparedPath,
    guidanceStrategy: IMPLEMENTATION_GUIDANCE_STRATEGY,
    guidanceHandoffPath: null,
    baselineSessionDir: null,
    currentSessionDir: null,
    baselinePreviewPath: null,
    currentPreviewPath: null,
    baselineSummaryPath: null,
    currentSummaryPath: null,
    comparisonPath: null,
    suggestionsPath: null,
    transcriptPath,
    effectiveAstPath,
    agentInputPath,
    explainabilityPath,
    touchedFiles: [],
    errorMessage: null,
    baselinePreviewUrl: null,
    baselinePreviewStdoutPath: null,
    baselinePreviewStderrPath: null,
    baselinePreviewStderrTail: [],
    currentPreviewUrl: null,
    currentPreviewStdoutPath: null,
    currentPreviewStderrPath: null,
    currentPreviewStderrTail: [],
  } satisfies RunRecordFile);

  const baselineSandbox = await createSandbox(runId, "baseline");
  const currentSandbox = await createSandbox(runId, "current");
  let activePhase: LocalWorkbenchRunPhase | null = null;

  async function runPhase<T>(
    phase: LocalWorkbenchRunPhase,
    message: string,
    work: () => Promise<T>,
  ): Promise<T> {
    activePhase = phase;
    await startRunPhase(runId, phase, message);
    try {
      const result = await work();
      await completeRunPhase(runId, phase, message);
      activePhase = null;
      return result;
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : String(error);
      await failRunPhase(runId, phase, failureMessage);
      activePhase = null;
      throw error;
    }
  }

  try {
    await runPhase("compile", "Compile the canonical UI AST bundle for the local workbench.", async () => {
      await runInterfacectlCli(
        ["compile", "--ast", effectiveAstPath, "--out", bundleRoot],
        { cwd: resolveWorkspaceRoot() },
      );
    });
    await runPhase("prepare", "Prepare the agent-ready generation payload.", async () => {
      await runInterfacectlCli(
        ["prepare-generation", "--bundle-root", bundleRoot, "--surface", TARGET.id, "--out", preparedPath],
        { cwd: resolveWorkspaceRoot() },
      );
    });

    const preparedPayload = await readJsonFile<Record<string, unknown>>(preparedPath);
    await runInterfacectlCli(
      [
        "init-generation-session",
        "--bundle-root",
        bundleRoot,
        "--surface",
        TARGET.id,
        "--workspace-root",
        baselineSandbox,
        "--tool",
        "local-llm",
        "--session",
        "baseline",
        "--artifacts-root",
        sessionsRoot,
      ],
      { cwd: baselineSandbox },
    );

    await runInterfacectlCli(
      [
        "init-generation-session",
        "--bundle-root",
        bundleRoot,
        "--surface",
        TARGET.id,
        "--workspace-root",
        currentSandbox,
        "--tool",
        "local-llm",
        "--session",
        "current",
        "--artifacts-root",
        sessionsRoot,
      ],
      { cwd: currentSandbox },
    );

    const baselineSessionDir = path.join(sessionsRoot, TARGET.id, "baseline");
    const currentSessionDir = path.join(sessionsRoot, TARGET.id, "current");
    await updateRunRecord(runId, {
      baselineSessionDir,
      currentSessionDir,
      guidanceStrategy: IMPLEMENTATION_GUIDANCE_STRATEGY,
    });

    const baselineAssessmentPath = path.join(runDir, "baseline.assessment.json");
    await writeJsonFile(
      baselineAssessmentPath,
      buildAssessmentPayload("Baseline snapshot before local agent edits.", []),
    );
    await runPhase("baseline-validation", "Record the untouched baseline validation state.", async () => {
      await runInterfacectlCli(
        ["record-generation-attempt", "--session-dir", baselineSessionDir, "--assessment-file", baselineAssessmentPath],
        { cwd: baselineSandbox },
      );
      const baselineSummaryPath = path.join(baselineSessionDir, "summary.json");
      await runInterfacectlCli(
        ["summarize-generation-session", "--session-dir", baselineSessionDir],
        { cwd: baselineSandbox, acceptExitCodes: [30] },
      );
      await updateRunRecord(runId, { baselineSummaryPath });
    });
    await runPhase("baseline-preview", "Capture the baseline preview from the local sandbox.", async () => {
      const baselinePort = await getAvailablePort();
      const baselineLogs = {
        stdoutPath: path.join(runDir, "baseline.preview.stdout.log"),
        stderrPath: path.join(runDir, "baseline.preview.stderr.log"),
      };
      await ensureSandboxPreviewDependencies(baselineSandbox);
      const baselineServer = await startReferenceTargetServer(baselineSandbox, baselinePort, baselineLogs);
      await updateRunRecord(runId, {
        ...previewDebugPatch("baseline", {
          url: baselineServer.url,
          stdoutPath: baselineServer.stdoutPath,
          stderrPath: baselineServer.stderrPath,
          stderrTail: [],
        }),
      });
      try {
        await waitForUrl(baselineServer.url, baselineServer);
        await runInterfacectlCli(
          [
            "capture-generation-preview",
            "--session-dir",
            baselineSessionDir,
            "--attempt",
            "1",
            "--url",
            baselineServer.url,
          ],
          { cwd: baselineSandbox },
        );
        const baselinePreviewPath = path.join(baselineSessionDir, "attempts", `${RERUN_ATTEMPT}.preview.png`);
        await updateRunRecord(runId, { baselinePreviewPath });
      } finally {
        await updateRunRecord(runId, {
          ...previewDebugPatch("baseline", {
            stderrTail: baselineServer.getStderrTail(),
          }),
        }).catch(() => undefined);
        await stopServer(baselineServer.child);
      }
    });

    const agentResult = await runPhase("agent", "Run the bounded LM Studio tool loop.", async () => {
      const result = await runLocalLlmAgent({
        config: llm,
        repoRoot: currentSandbox,
        allowedRoots: [TARGET.appPath],
        preparedPayload,
        implementationBrief: TARGET.implementationBrief,
        acceptedSuggestions: activeAcceptedSuggestions,
        effectiveAstSummary: await uiAstSummaryText(session.workingAst),
        activeDesignerNotes: session.activeDesignerNotes,
      }).catch(async (error) => {
        const transcript = extractTranscriptFromError(error);
        if (transcript) {
          await writeJsonFile(transcriptPath, transcript);
        }
        throw error;
      });
      await writeJsonFile(transcriptPath, result.transcript);
      await fsp.writeFile(agentInputPath, result.agentInput, "utf8");
    await writeRunExplainability({
      runId,
      explainabilityPath,
      effectiveAstPath,
      agentInputPath,
      guidanceStrategy: IMPLEMENTATION_GUIDANCE_STRATEGY,
      guidanceHandoffPath: null,
      activeAstChanges: session.activeAstChanges,
      activeDesignerNotes: session.activeDesignerNotes,
    });
      await updateRunRecord(runId, {
        transcriptPath,
        touchedFiles: result.touchedFiles,
        agentSummary: result.summary,
        noChanges: result.noChanges,
        toolCallCount: result.toolCallCount,
        writeCount: result.writeCount,
        lastToolName: result.lastToolName,
      });
      return result;
    });

    const currentAssessmentPath = path.join(runDir, "current.assessment.json");
    await writeJsonFile(
      currentAssessmentPath,
      buildAssessmentPayload(
        agentResult.noChanges
          ? "Current snapshot after local LLM reported no-op."
          : "Current snapshot after local LLM implementation pass.",
        agentResult.touchedFiles,
      ),
    );

    await runPhase("current-validation", "Validate the post-agent implementation pass.", async () => {
      await runInterfacectlCli(
        ["record-generation-attempt", "--session-dir", currentSessionDir, "--assessment-file", currentAssessmentPath],
        { cwd: currentSandbox },
      );
      const currentSummaryPath = path.join(currentSessionDir, "summary.json");
      await runInterfacectlCli(
        ["summarize-generation-session", "--session-dir", currentSessionDir],
        { cwd: currentSandbox, acceptExitCodes: [30] },
      );
      await updateRunRecord(runId, { currentSummaryPath });
    });
    await runPhase("current-preview", "Capture the post-agent preview from the local sandbox.", async () => {
      const currentPort = await getAvailablePort();
      const currentLogs = {
        stdoutPath: path.join(runDir, "current.preview.stdout.log"),
        stderrPath: path.join(runDir, "current.preview.stderr.log"),
      };
      await ensureSandboxPreviewDependencies(currentSandbox);
      const currentServer = await startReferenceTargetServer(currentSandbox, currentPort, currentLogs);
      await updateRunRecord(runId, {
        ...previewDebugPatch("current", {
          url: currentServer.url,
          stdoutPath: currentServer.stdoutPath,
          stderrPath: currentServer.stderrPath,
          stderrTail: [],
        }),
      });
      try {
        await waitForUrl(currentServer.url, currentServer);
        await runInterfacectlCli(
          [
            "capture-generation-preview",
            "--session-dir",
            currentSessionDir,
            "--attempt",
            "1",
            "--url",
            currentServer.url,
          ],
          { cwd: currentSandbox },
        );
        const currentPreviewPath = path.join(currentSessionDir, "attempts", `${RERUN_ATTEMPT}.preview.png`);
        await updateRunRecord(runId, { currentPreviewPath });
      } finally {
        await updateRunRecord(runId, {
          ...previewDebugPatch("current", {
            stderrTail: currentServer.getStderrTail(),
          }),
        }).catch(() => undefined);
        await stopServer(currentServer.child);
      }
    });

    const baselineValidatePath = path.join(baselineSessionDir, "attempts", `${RERUN_ATTEMPT}.validate.json`);
    const currentValidatePath = path.join(currentSessionDir, "attempts", `${RERUN_ATTEMPT}.validate.json`);
    const baselineValidate = await readJsonFile<Record<string, unknown>>(baselineValidatePath);
    const currentValidate = await readJsonFile<Record<string, unknown>>(currentValidatePath);
    const remainingAcceptedSuggestions = pruneAcceptedSuggestions(activeAcceptedSuggestions, currentValidate);
    await writeAcceptedSuggestions(remainingAcceptedSuggestions);
    await appendLocalWorkbenchGenerationRunArtifact({
      runId,
      createdAt: runCreatedAt,
      effectiveAstPath,
      validatePath: currentValidatePath,
      validatePayload: currentValidate,
    });

    await runPhase("finalize", "Persist comparison metrics and structured suggestions.", async () => {
      const comparison = buildComparison(baselineValidate, currentValidate);
      const comparisonPath = path.join(runDir, "comparison.json");
      await writeJsonFile(comparisonPath, comparison);

      const suggestionsPath = path.join(runDir, "suggestions.json");
      await writeJsonFile(suggestionsPath, {
        runId,
        suggestions: suggestionSummaryFromRun(preparedPayload, currentValidate, {
          acceptedSuggestions: remainingAcceptedSuggestions,
        }),
      });

      await updateRunRecord(runId, {
        comparisonPath,
        suggestionsPath,
        touchedFiles: agentResult.touchedFiles,
      });
    });

    const noOpAcceptedFailure = unresolvedAcceptedSuggestionNoopErrorMessage(
      agentResult.noChanges,
      remainingAcceptedSuggestions,
      currentValidate,
    );
    if (noOpAcceptedFailure) {
      await updateRunRecord(runId, {
        touchedFiles: agentResult.touchedFiles,
      });
      throw new Error(noOpAcceptedFailure);
    }

    await updateRunRecord(runId, {
      status: "succeeded",
      completedAt: new Date().toISOString(),
      currentPhase: null,
      lastError: null,
      touchedFiles: agentResult.touchedFiles,
    });
    return { runId, status: "succeeded" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (activePhase) {
      await failRunPhase(runId, activePhase, message).catch(() => undefined);
    }
    await updateRunRecord(runId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      currentPhase: activePhase,
      errorMessage: message,
    }).catch(() => undefined);
    return { runId, status: "failed" };
  } finally {
    await removeSandbox(currentSandbox).catch(() => undefined);
    await removeSandbox(baselineSandbox).catch(() => undefined);
  }
}

function normalizeBenchmarkFixtureIds(
  fixtureIds?: string[],
): BenchmarkFixtureId[] {
  const source = fixtureIds?.length ? fixtureIds : BENCHMARK_FIXTURE_IDS;
  const unique = [...new Set(source)];
  const allowedFixtureIds = new Set<string>(BENCHMARK_FIXTURE_IDS);
  const normalized = unique.map((fixtureId) => {
    if (!allowedFixtureIds.has(fixtureId)) {
      throw new Error(`Unknown benchmark fixture: ${fixtureId}`);
    }
    return fixtureId as BenchmarkFixtureId;
  });
  if (normalized.length === 0) {
    throw new Error("Benchmark cohorts require at least one fixture.");
  }
  return normalized;
}

export async function runBenchmarkCohort(input: {
  fixtureIds?: string[];
  strategies?: ImplementationGuidanceStrategy[];
  cohortId?: string;
  profilesByFixtureId?: Partial<Record<BenchmarkFixtureId, BenchmarkFixtureProfile>>;
  benchmarkSpecPath?: string;
  sourceRunPath?: string;
  tool?: "local-llm";
  requestedModelLabel?: string;
  resolvedModelId?: string;
  fingerprint?: string;
  platformTarget?: BenchmarkPlatformTarget;
  consumerType?: BenchmarkConsumerType;
  capturePreset?: string;
} = {}): Promise<BenchmarkCohortResult> {
  const cohortId = input.cohortId?.trim() || buildRunId();
  const workspaceRoot = resolveWorkspaceRoot();
  const benchmarkDir = path.join(workspaceRoot, "artifacts", "generation-benchmarks", cohortId);
  const reportDir = path.join(benchmarkDir, "report");
  const sessionsRoot = path.join(workspaceRoot, "artifacts", "generation-sessions");
  const specPath = input.benchmarkSpecPath?.trim()
    ? path.resolve(input.benchmarkSpecPath)
    : path.join(benchmarkDir, "spec.json");
  const runPath = path.join(benchmarkDir, "run.json");

  await fsp.mkdir(benchmarkDir, { recursive: true });
  const llm = resolveLocalLlmConfig();
  const tool = input.tool ?? "local-llm";
  if (tool !== "local-llm") {
    throw new Error(`Unsupported benchmark tool: ${tool}`);
  }
  const resolvedModelId = input.resolvedModelId?.trim() || llm.model;
  const requestedModelLabel = input.requestedModelLabel?.trim() || defaultRequestedModelLabel(resolvedModelId);
  const consumerType = input.consumerType ?? "web-browser";
  const platformTarget = input.platformTarget ?? "web";
  const capturePreset = input.capturePreset ?? defaultCapturePresetForConsumerType(consumerType);

  let fixtureIds: BenchmarkFixtureId[];
  let guidanceStrategies: ImplementationGuidanceStrategy[];
  let comparisonPairs: BenchmarkComparisonPair[];
  let spec: BenchmarkSpecManifest;
  const fixtureProfiles = new Map<BenchmarkFixtureId, BenchmarkFixtureProfile>();

  if (input.benchmarkSpecPath?.trim()) {
    spec = await readJsonFile<BenchmarkSpecManifest>(specPath);
    fixtureIds = normalizeBenchmarkFixtureIds(spec.fixtures.map((fixture) => fixture.fixtureId));
    const defaultStrategies = getBenchmarkFixtureProfile(fixtureIds[0]!).defaultStrategies;
    guidanceStrategies = normalizeBenchmarkStrategies(
      spec.guidanceStrategies as ImplementationGuidanceStrategy[],
      defaultStrategies,
    );
    comparisonPairs = spec.comparisonPairs as BenchmarkComparisonPair[];
  } else {
    fixtureIds = normalizeBenchmarkFixtureIds(input.fixtureIds);
    const defaultStrategies: ImplementationGuidanceStrategy[] = ["unguided", ...getBenchmarkFixtureProfile(fixtureIds[0]!).defaultStrategies];
    guidanceStrategies = normalizeBenchmarkStrategies(input.strategies, defaultStrategies);
    comparisonPairs = buildBenchmarkComparisonPairs(guidanceStrategies);
    const specFixtures: BenchmarkSpecFixture[] = [];
    for (const fixtureId of fixtureIds) {
      const fixture = getBenchmarkFixture(fixtureId);
      const profile = input.profilesByFixtureId?.[fixtureId] ?? getBenchmarkFixtureProfile(fixtureId);
      fixtureProfiles.set(fixtureId, profile);
      const fixtureDir = path.join(benchmarkDir, "fixtures", fixture.id);
      await fsp.mkdir(fixtureDir, { recursive: true });
      const frozenBrief = await writeFrozenTextFile(
        path.join(fixtureDir, "implementation-brief.md"),
        profile.implementationBrief,
      );
      specFixtures.push(buildBenchmarkSpecFixture({
        fixture,
        brief: frozenBrief,
        comparisonPairs,
        platformTarget,
        consumerType,
        capturePreset,
        fixtureDir,
      }));
    }
    spec = {
      schemaVersion: 1,
      specId: "surfaceops-benchmark-suite/default",
      generatedAt: new Date().toISOString(),
      evaluationMode: "zero-shot",
      attemptBudget: 1,
      guidanceStrategies,
      comparisonPairs,
      suiteId: "surfaceops-benchmark-suite/default",
      suiteName: "SurfaceOps Benchmark Fixture Suite",
      fixtures: specFixtures,
    };
    await writeJsonFile(specPath, spec);
  }

  const inferredSourceRunPath = input.sourceRunPath?.trim()
    ? path.resolve(input.sourceRunPath)
    : input.benchmarkSpecPath?.trim()
      ? (() => {
          const sibling = path.join(path.dirname(specPath), "run.json");
          return fs.existsSync(sibling) ? sibling : undefined;
        })()
      : undefined;
  let runManifest = await initializeBenchmarkRunManifest({
    benchmarkDir,
    specPath,
    cohortId,
    tool,
    sourceRunPath: inferredSourceRunPath,
    requestedModelLabel: requestedModelLabel ?? undefined,
    resolvedModelId,
    baseUrl: llm.baseUrl,
    fingerprint: input.fingerprint?.trim() || buildResolvedModelFingerprint(llm.baseUrl, resolvedModelId) || buildLocalModelFingerprint(llm),
  });

  const benchmarkAgentBudgets: LocalLlmAgentBudgets = {
    maxTurns: 32,
    maxToolCalls: 64,
    maxWallTimeMs: 300_000,
  };
  const comparisonPaths: string[] = [];
  const allSessionDirs: string[] = [];
  const runFixtures: BenchmarkRunManifest["fixtures"] = [];

  for (const fixtureId of fixtureIds) {
    const fixture = getBenchmarkFixture(fixtureId);
    const fixtureSpec = spec.fixtures.find((entry) => entry.fixtureId === fixtureId);
    if (!fixtureSpec) {
      throw new Error(`Benchmark spec is missing fixture ${fixtureId}.`);
    }
    const profile = fixtureProfiles.get(fixtureId)
      ?? input.profilesByFixtureId?.[fixtureId]
      ?? getBenchmarkFixtureProfile(fixtureId);
    const fixtureDir = path.join(benchmarkDir, "fixtures", fixture.id);
    const comparisonsDir = path.join(fixtureDir, "comparisons");
    const strategyArtifactsDir = path.join(fixtureDir, "strategies");
    const bundleRoot = path.join(fixtureDir, "bundle");
    const preparedPath = path.join(fixtureDir, "prepared-input.json");
    const effectiveAstPath = path.join(fixtureDir, "effective-ui-ast.json");
    const baselineSeedDir = path.join(fixtureDir, "baseline-seed");

    await fsp.mkdir(fixtureDir, { recursive: true });
    const effectiveAst = await loadFixtureUiAst(fixture);
    await writeJsonFile(effectiveAstPath, effectiveAst);
    const frozenBrief = fixtureSpec.brief;

    await runInterfacectlCli(
      ["compile", "--ast", effectiveAstPath, "--out", bundleRoot],
      { cwd: workspaceRoot },
    );
    await runInterfacectlCli(
      ["prepare-generation", "--bundle-root", bundleRoot, "--surface", fixture.id, "--out", preparedPath],
      { cwd: workspaceRoot },
    );

    const preparedPayload = await readJsonFile<Record<string, unknown>>(preparedPath);
    const baselineValidate = await collectReferenceTargetBenchmarkBaselineValidate({
      fixture,
      runId: cohortId,
      artifactBaseDir: baselineSeedDir,
      sessionsRoot,
      bundleRoot,
      briefFile: frozenBrief.path,
    });
    const acceptedAt = new Date().toISOString();
    const acceptedSuggestions = mergeBenchmarkAcceptedSuggestions({
      fixture,
      baselineSuggestions: suggestionSummaryFromRun(preparedPayload, baselineValidate, { fixture }),
      profileAcceptedSuggestions: profile.acceptedSuggestions,
      sourceRunId: `${cohortId}/baseline-seed`,
      acceptedAt,
    });
    const runtimeGuidancePaths = await writeFrozenRuntimeGuidancePaths(
      fixtureDir,
      acceptedSuggestions,
      profile.designerNotes,
    );

    const sessionResults: ReferenceTargetImplementationSessionResult[] = [];
    for (const guidanceStrategy of guidanceStrategies) {
      sessionResults.push(await runReferenceTargetImplementationSession({
        fixture,
        llm,
        runId: cohortId,
        artifactBaseDir: path.join(strategyArtifactsDir, guidanceStrategy),
        sessionsRoot,
        bundleRoot,
        preparedPayload,
        effectiveAstPath,
        effectiveAst,
        implementationBrief: profile.implementationBrief,
        guidanceStrategy,
        briefFile: frozenBrief.path,
        sessionId: `${cohortId}/${guidanceStrategy}`,
        sandboxLabel: `benchmark-${fixture.id}-${guidanceStrategy}`,
        runtimeGuidancePaths,
        runtimeGuidance: {
          acceptedSuggestions,
          designerNotes: profile.designerNotes,
        },
        activeAstChanges: [],
        baselineValidate,
        agentBudgets: benchmarkAgentBudgets,
      }));
    }

    const manifestComparisons: BenchmarkRunManifest["fixtures"][number]["comparisons"] = [];
    for (const pair of comparisonPairs) {
      const baseline = sessionResults.find((result) => result.guidanceStrategy === pair.baselineGuidanceStrategy);
      const guided = sessionResults.find((result) => result.guidanceStrategy === pair.guidedGuidanceStrategy);
      if (!baseline || !guided) {
        throw new Error(
          `Could not resolve benchmark sessions for ${fixture.id}: ${pair.baselineGuidanceStrategy} vs ${pair.guidedGuidanceStrategy}.`,
        );
      }
      const comparisonResult = await runInterfacectlCli(
        [
          "compare-generation-sessions",
          "--baseline-session-dir",
          baseline.sessionDir,
          "--guided-session-dir",
          guided.sessionDir,
          "--out-dir",
          path.join(comparisonsDir, `${pair.baselineGuidanceStrategy}--vs--${pair.guidedGuidanceStrategy}`),
        ],
        { cwd: workspaceRoot },
      );
      const comparisonPath = parseJson<{ paths?: { jsonPath?: string } }>(
        comparisonResult.stdout,
        "benchmark comparison output",
      ).paths?.jsonPath ?? null;
      if (!comparisonPath) {
        throw new Error(
          `interfacectl did not return a comparison JSON path for ${fixture.id}: ${pair.baselineGuidanceStrategy} vs ${pair.guidedGuidanceStrategy}.`,
        );
      }
      comparisonPaths.push(comparisonPath);
      manifestComparisons.push({
        baselineGuidanceStrategy: pair.baselineGuidanceStrategy,
        guidedGuidanceStrategy: pair.guidedGuidanceStrategy,
        comparisonDir: path.dirname(comparisonPath),
        comparisonPath,
      });
    }

    allSessionDirs.push(...sessionResults.map((result) => result.sessionDir));
    runFixtures.push({
      ...fixtureSpec,
      paths: {
        fixtureDir,
        sourceContractPath: fixtureSpec.paths?.sourceContractPath,
        sourceAstPath: fixtureSpec.paths?.sourceAstPath,
        bundleRoot,
        compiledContractPath: path.join(bundleRoot, "derived", "contract.normalized.json"),
        effectiveAstPath,
        preparedInputPath: preparedPath,
        acceptedSuggestionsPath: runtimeGuidancePaths.acceptedSuggestionsPath,
        designerNotesPath: runtimeGuidancePaths.designerNotesPath,
        baselineValidatePath: path.join(baselineSeedDir, "attempt.validate.json"),
      },
      sessions: sessionResults.map((result) => ({
        guidanceStrategy: result.guidanceStrategy,
        sessionId: result.sessionId,
        sessionDir: result.sessionDir,
        transcriptPath: result.transcriptPath,
        guidanceHandoffPath: result.guidanceHandoffPath,
        agentInputPath: result.agentInputPath,
        explainabilityPath: result.explainabilityPath,
        summaryPath: result.summaryPath,
        previewPath: result.previewPath,
      })),
      comparisons: manifestComparisons,
    });
  }

  runManifest = {
    ...runManifest,
    guidanceStrategies,
    comparisonPairs,
    paths: {
      ...runManifest.paths,
      runPath,
    },
    fixtures: runFixtures,
  };
  await writeJsonFile(runPath, runManifest);

  const reportOutput = await runInterfacectlCli(
    [
      "summarize-generation-benchmark",
      "--run-path",
      runPath,
      ...(comparisonPaths.length > 0 ? ["--comparisons", comparisonPaths.join(",")] : []),
      "--out-dir",
      reportDir,
    ],
    { cwd: workspaceRoot },
  );
  const reportPaths = parseJson<{ paths?: { jsonPath?: string; markdownPath?: string } }>(
    reportOutput.stdout,
    "benchmark summary output",
  ).paths ?? {};
  const reportPath = reportPaths.jsonPath ?? path.join(reportDir, "benchmark-report.json");
  const reportMarkdownPath = reportPaths.markdownPath ?? path.join(reportDir, "benchmark-report.md");

  return {
    cohortId,
    benchmarkDir,
    specPath: runManifest.paths.specPath,
    runPath,
    manifestPath: runPath,
    reportPath,
    comparisonPaths,
    sessionDirs: allSessionDirs,
    surfaceIds: fixtureIds,
  };
}

export async function runReferenceTargetBenchmarkCohort(input: {
  strategies?: ImplementationGuidanceStrategy[];
  cohortId?: string;
  profile?: ReferenceTargetBenchmarkProfile;
} = {}): Promise<ReferenceTargetBenchmarkCohortResult> {
  return runBenchmarkCohort({
    fixtureIds: [REFERENCE_TARGET.id],
    strategies: input.strategies,
    cohortId: input.cohortId,
    profilesByFixtureId: input.profile
      ? { [REFERENCE_TARGET.id]: input.profile }
      : undefined,
  });
}

export async function reviewLocalWorkbenchSuggestion(input: {
  runId: string;
  suggestionId: string;
  decision: LocalSuggestionStatus;
  rationale?: string;
}): Promise<void> {
  const record = await loadRunRecord(input.runId);
  if (!record?.suggestionsPath) {
    throw new Error(`Suggestions not found for run ${input.runId}.`);
  }
  const payload = await readJsonFile<Record<string, unknown>>(record.suggestionsPath);
  const suggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
  const matchedSuggestion = suggestions.find((entry) =>
    entry && typeof entry === "object" && String((entry as Record<string, unknown>).suggestionId ?? "") === input.suggestionId,
  ) as Record<string, unknown> | undefined;
  if (!matchedSuggestion) {
    throw new Error(`Suggestion ${input.suggestionId} not found for run ${input.runId}.`);
  }
  const updated = suggestions.map((entry) => {
    if (!entry || typeof entry !== "object") {
      return entry;
    }
    if (String((entry as Record<string, unknown>).suggestionId ?? "") !== input.suggestionId) {
      return entry;
    }
    return {
      ...entry,
      status: input.decision,
      ...(input.rationale ? { rationale: input.rationale } : {}),
    };
  });
  await writeJsonFile(record.suggestionsPath, { ...payload, suggestions: updated });

  const findingCode = String(matchedSuggestion.findingCode ?? "");
  if (!findingCode) {
    return;
  }
  const acceptedSuggestions = await loadAcceptedSuggestions();
  if (input.decision === "accepted") {
    const nextSuggestion = enrichSuggestionGuidance({
      findingCode,
      findingMessage: String(matchedSuggestion.findingMessage ?? findingCode),
      summary: String(matchedSuggestion.summary ?? `Review and refine ${findingCode}.`),
      suggestedPath: String(matchedSuggestion.suggestedPath ?? TARGET.appPath),
      sourceRunId: input.runId,
      acceptedAt: new Date().toISOString(),
      ...(input.rationale ? { rationale: input.rationale } : {}),
    });
    const nextSuggestions = [
      ...acceptedSuggestions.filter((suggestion) => suggestion.findingCode !== findingCode),
      nextSuggestion,
    ];
    await writeAcceptedSuggestions(nextSuggestions);
    return;
  }

  await writeAcceptedSuggestions(
    acceptedSuggestions.filter((suggestion) => suggestion.findingCode !== findingCode),
  );
}
