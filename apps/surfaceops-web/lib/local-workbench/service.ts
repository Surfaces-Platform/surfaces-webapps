import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { runInterfacectlCli, resolveWorkspaceRoot } from "@/lib/interfacectl";
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
  LocalWorkbenchContractChange,
  LocalWorkbenchData,
  LocalWorkbenchDesignerNote,
  LocalWorkbenchRun,
  LocalWorkbenchSuggestion,
  StartLocalRerunResult,
} from "./types";

const TARGET = {
  id: "reference-target-web",
  label: "Reference Target Web",
  appPath: "apps/reference-target-web",
  contractPath: "contracts/generated/reference-target-web.contract.json",
  implementationBrief:
    "Refine the reference target UI to better match the contract-guided surface while preserving deterministic fixture behavior.",
};

const RERUN_ATTEMPT = "001";
const DEFAULT_LOCAL_LLM_BASE_URL = "http://127.0.0.1:1234/v1";
const DEFAULT_LOCAL_LLM_MODEL = "openai/gpt-oss-120b";
const CONTRACT_SESSION_SCHEMA_VERSION = 2;

interface RunRecordFile {
  schemaVersion: 1;
  runId: string;
  status: "running" | "succeeded" | "failed";
  createdAt: string;
  completedAt: string | null;
  contractPath: string;
  preparedInputPath: string | null;
  baselineSessionDir: string | null;
  currentSessionDir: string | null;
  baselinePreviewPath: string | null;
  currentPreviewPath: string | null;
  baselineSummaryPath: string | null;
  currentSummaryPath: string | null;
  comparisonPath: string | null;
  suggestionsPath: string | null;
  transcriptPath: string | null;
  effectiveContractPath: string | null;
  agentInputPath: string | null;
  explainabilityPath: string | null;
  touchedFiles: string[];
  errorMessage: string | null;
}

interface ContractDocument {
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
    allowedFonts?: string[];
    layout?: { maxContentWidth?: number };
    requiredSections?: string[];
  }>;
}

interface ContractSessionFile {
  schemaVersion: 2;
  surfaceId: string;
  canonicalContractPath: string;
  updatedAt: string;
  workingContract: ContractDocument;
  chat: LocalWorkbenchChatMessage[];
  activeContractChanges: LocalWorkbenchContractChange[];
  activeDesignerNotes: LocalWorkbenchDesignerNote[];
}

interface RunExplainabilityFile {
  schemaVersion: 1;
  runId: string;
  createdAt: string;
  effectiveContractPath: string | null;
  agentInputPath: string | null;
  activeContractChanges: LocalWorkbenchContractChange[];
  activeDesignerNotes: LocalWorkbenchDesignerNote[];
}

interface StartedReferenceTargetServer {
  child: ChildProcess;
  getOutputTail: () => string;
}

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

function resolveTargetAppPath(): string {
  return path.join(resolveWorkspaceRoot(), TARGET.appPath);
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

function resolveRunDirectory(runId: string): string {
  return path.join(resolveRunsDirectory(), runId);
}

function resolveRunRecordPath(runId: string): string {
  return path.join(resolveRunDirectory(runId), "run.json");
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

async function readJsonFile<T>(filePath: string): Promise<T> {
  return parseJson<T>(await fsp.readFile(filePath, "utf8"), filePath);
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, stringifyJson(value), "utf8");
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

function summarizeContract(contract: ContractDocument) {
  const surface = contract.surfaces?.find((entry) => entry.id === TARGET.id) ?? contract.surfaces?.[0];
  return {
    contractId: contract.contractId ?? TARGET.id,
    version: contract.version ?? "0.0.0",
    description: contract.description ?? "",
    requiredSections: [
      ...new Set(
        (surface?.requiredSections ?? contract.sections?.map((entry) => entry.id).filter(Boolean) ?? []).filter(
          (entry): entry is string => typeof entry === "string" && entry.length > 0,
        ),
      ),
    ],
    allowedFonts: [...new Set(surface?.allowedFonts ?? [])],
    maxContentWidth: typeof surface?.layout?.maxContentWidth === "number" ? surface.layout.maxContentWidth : null,
    colorPolicy: contract.color?.policy ?? "off",
    allowedColors: [...new Set(contract.color?.allowedValues ?? [])],
  };
}

function contractSummaryText(contract: ContractDocument): string {
  const summary = summarizeContract(contract);
  return [
    `${summary.contractId} v${summary.version}`,
    summary.description || "Working contract for the local workbench.",
    `Required sections: ${summary.requiredSections.join(", ") || "none recorded"}`,
    `Fonts: ${summary.allowedFonts.join(", ") || "none recorded"}`,
    `Max content width: ${summary.maxContentWidth ?? "not specified"}`,
    `Color policy: ${summary.colorPolicy}`,
    `Allowed colors: ${summary.allowedColors.join(", ") || "none recorded"}`,
  ].join("\n");
}

function buildContractSummaryMessage(contract: ContractDocument): LocalWorkbenchChatMessage {
  return {
    id: "contract-summary",
    role: "system",
    title: "Working contract",
    content: contractSummaryText(contract),
    createdAt: new Date(0).toISOString(),
  };
}

function cloneContract(contract: ContractDocument): ContractDocument {
  return parseJson<ContractDocument>(JSON.stringify(contract), "working contract clone");
}

function ensureTargetSurface(contract: ContractDocument) {
  contract.surfaces ??= [];
  let surface = contract.surfaces.find((entry) => entry.id === TARGET.id);
  if (!surface) {
    surface = { id: TARGET.id, allowedFonts: [], layout: {}, requiredSections: [] };
    contract.surfaces.push(surface);
  }
  surface.allowedFonts ??= [];
  surface.layout ??= {};
  surface.requiredSections ??= [];
  return surface;
}

function ensureContractColor(contract: ContractDocument) {
  contract.color ??= {};
  contract.color.allowedValues ??= [];
  return contract.color;
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

function isGenericSuggestionPath(suggestedPath: string): boolean {
  const normalized = suggestedPath.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  return !normalized || normalized === TARGET.appPath;
}

function defaultSuggestedPathForFinding(findingCode: string, locationFile: string | null): string {
  if (locationFile?.trim()) {
    return locationFile.trim();
  }
  const knownPath = defaultSuggestedPathForKnownFinding(findingCode);
  if (knownPath) {
    return knownPath;
  }
  switch (findingCode) {
    case "layout.container-missing":
    case "section.missing":
    case "section.unexpected":
      return `${TARGET.appPath}/app/page.tsx`;
    default:
      return TARGET.appPath;
  }
}

function defaultSummaryForFinding(findingCode: string, findingMessage: string): string {
  const knownSummary = defaultSummaryForKnownFinding(findingCode);
  if (knownSummary) {
    return knownSummary;
  }
  switch (findingCode) {
    case "layout.container-missing":
      return "Restore the required page-container marker on the main surface container.";
    default:
      return findingMessage?.trim() ? `Address ${findingCode}: ${findingMessage.trim()}` : `Review and refine ${findingCode}.`;
  }
}

function enrichSuggestionGuidance<T extends {
  findingCode: string;
  findingMessage: string;
  summary: string;
  suggestedPath: string;
}>(suggestion: T, locationFile: string | null = null): T {
  const nextSuggestedPath = isGenericSuggestionPath(suggestion.suggestedPath)
    ? defaultSuggestedPathForFinding(suggestion.findingCode, locationFile)
    : suggestion.suggestedPath;
  const nextSummary = (isGenericSuggestionSummary(suggestion.summary, suggestion.findingCode)
    || suggestionSummaryNeedsRefresh(suggestion.summary, suggestion.findingCode))
    ? defaultSummaryForFinding(suggestion.findingCode, suggestion.findingMessage)
    : suggestion.summary;
  return {
    ...suggestion,
    suggestedPath: nextSuggestedPath,
    summary: nextSummary,
  };
}

function normalizeAcceptedSuggestion(entry: unknown): LocalWorkbenchAcceptedSuggestion | null {
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
  });
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

function mergeActiveContractChange(
  current: LocalWorkbenchContractChange[],
  canonicalContract: ContractDocument,
  sourceMessageId: string,
  createdAt: string,
  change: {
    field: LocalWorkbenchContractChange["field"];
    action: LocalWorkbenchContractChange["action"];
    value: string | number;
    summary: string;
  },
): LocalWorkbenchContractChange[] {
  const canonicalSummary = summarizeContract(canonicalContract);
  const next = current.filter((entry) => {
    if (change.field === "color.allowedValues" || change.field === "surfaces.reference-target-web.allowedFonts") {
      return !(entry.field === change.field && String(entry.value) === String(change.value));
    }
    return entry.field !== change.field;
  });

  if (
    (change.field === "color.policy" && String(change.value) === canonicalSummary.colorPolicy)
    || (
      change.field === "surfaces.reference-target-web.layout.maxContentWidth"
      && Number(change.value) === canonicalSummary.maxContentWidth
    )
    || (
      change.field === "color.allowedValues"
      && canonicalSummary.allowedColors.includes(String(change.value))
    )
    || (
      change.field === "surfaces.reference-target-web.allowedFonts"
      && canonicalSummary.allowedFonts.includes(String(change.value))
    )
  ) {
    return next;
  }

  next.push({
    id: randomUUID(),
    field: change.field,
    action: change.action,
    value: change.value,
    summary: change.summary,
    createdAt,
    sourceMessageId,
  });
  return next;
}

function applyContractChange(contract: ContractDocument, change: {
  field: LocalWorkbenchContractChange["field"];
  action: LocalWorkbenchContractChange["action"];
  value: string | number;
}): void {
  const surface = ensureTargetSurface(contract);
  const color = ensureContractColor(contract);

  switch (change.field) {
    case "color.allowedValues":
      if (typeof change.value === "string" && !color.allowedValues?.includes(change.value)) {
        color.allowedValues?.push(change.value);
      }
      return;
    case "color.policy":
      if (typeof change.value === "string") {
        color.policy = change.value;
      }
      return;
    case "surfaces.reference-target-web.layout.maxContentWidth":
      if (typeof change.value === "number") {
        surface.layout!.maxContentWidth = change.value;
      }
      return;
    case "surfaces.reference-target-web.allowedFonts":
      if (typeof change.value === "string" && !surface.allowedFonts?.includes(change.value)) {
        surface.allowedFonts?.push(change.value);
      }
      return;
  }
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
      : "Contract shaper";
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
  existing: Partial<ContractSessionFile> & { schemaVersion?: number },
): Promise<ContractSessionFile> {
  const canonicalContractPath = existing.canonicalContractPath ?? resolveTargetContractPath();
  const canonicalContract = await readJsonFile<ContractDocument>(canonicalContractPath);
  const fallbackTimestamp = existing.updatedAt ?? new Date().toISOString();
  const originalChat = (Array.isArray(existing.chat) ? existing.chat : [])
    .map((entry) => normalizeStoredChatMessage(entry, fallbackTimestamp))
    .filter((entry): entry is LocalWorkbenchChatMessage => Boolean(entry));

  let workingContract = cloneContract(canonicalContract);
  let activeContractChanges: LocalWorkbenchContractChange[] = [];
  let activeDesignerNotes: LocalWorkbenchDesignerNote[] = [];
  const nextChat: LocalWorkbenchChatMessage[] = [];
  let pendingAssistantMessage: LocalWorkbenchChatMessage | null = null;

  for (const message of originalChat) {
    if (message.role === "user") {
      nextChat.push(message);
      const result = await shapeLocalWorkbenchContract({
        config: resolveLocalLlmConfig(),
        message: message.content,
        contractSummary: contractSummaryText(workingContract),
        activeDesignerNotes,
      });

      for (const change of result.contractChanges) {
        applyContractChange(workingContract, change);
        activeContractChanges = mergeActiveContractChange(
          activeContractChanges,
          canonicalContract,
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
        title: "Contract shaper",
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
    schemaVersion: CONTRACT_SESSION_SCHEMA_VERSION,
    surfaceId: TARGET.id,
    canonicalContractPath,
    updatedAt: new Date().toISOString(),
    workingContract,
    chat: nextChat,
    activeContractChanges,
    activeDesignerNotes,
  };
}

async function loadOrInitContractSession(): Promise<ContractSessionFile> {
  const sessionPath = resolveContractSessionPath();
  if (await fileExists(sessionPath)) {
    const existing = await readJsonFile<Partial<ContractSessionFile> & { schemaVersion?: number }>(sessionPath);
    if (existing.schemaVersion === CONTRACT_SESSION_SCHEMA_VERSION) {
      return {
        schemaVersion: CONTRACT_SESSION_SCHEMA_VERSION,
        surfaceId: TARGET.id,
        canonicalContractPath: existing.canonicalContractPath ?? resolveTargetContractPath(),
        updatedAt: existing.updatedAt ?? new Date().toISOString(),
        workingContract: existing.workingContract ?? await readJsonFile<ContractDocument>(resolveTargetContractPath()),
        chat: (Array.isArray(existing.chat) ? existing.chat : [])
          .map((entry) => normalizeStoredChatMessage(entry, existing.updatedAt ?? new Date().toISOString()))
          .filter((entry): entry is LocalWorkbenchChatMessage => Boolean(entry)),
        activeContractChanges: Array.isArray(existing.activeContractChanges) ? existing.activeContractChanges : [],
        activeDesignerNotes: Array.isArray(existing.activeDesignerNotes) ? existing.activeDesignerNotes : [],
      };
    }

    const upgradedSession = await replayLegacyContractSession(existing);
    await writeContractSession(upgradedSession);
    return upgradedSession;
  }

  const canonicalContractPath = resolveTargetContractPath();
  const workingContract = await readJsonFile<ContractDocument>(canonicalContractPath);
  const session = {
    schemaVersion: CONTRACT_SESSION_SCHEMA_VERSION,
    surfaceId: TARGET.id,
    canonicalContractPath,
    updatedAt: new Date().toISOString(),
    workingContract,
    chat: [],
    activeContractChanges: [],
    activeDesignerNotes: [],
  } satisfies ContractSessionFile;
  await writeJsonFile(sessionPath, session);
  return session;
}

async function writeContractSession(session: ContractSessionFile): Promise<void> {
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
      const suggestionId = `suggestion-${index + 1}`;
      const reviewed = reviewedBySuggestionId.get(suggestionId) ?? reviewedByFindingCode.get(code);
      const accepted = acceptedByFindingCode.get(code);
      const reviewedSummary = typeof reviewed?.summary === "string" ? reviewed.summary : null;
      const reviewedPath = typeof reviewed?.suggestedPath === "string" ? reviewed.suggestedPath : null;
      const reviewedRationale = typeof reviewed?.rationale === "string" ? reviewed.rationale : null;
      const repairSummary = repair ? String(repair.summary ?? repair.code ?? code) : null;
      const repairPath = repair ? String(repair.path ?? TARGET.appPath) : null;
      const status = accepted
        ? "accepted"
        : (reviewed ? String(reviewed.status ?? "proposed") : "proposed") as LocalSuggestionStatus;
      return enrichSuggestionGuidance({
        suggestionId,
        findingCode: code,
        findingMessage: String(finding.message ?? code),
        summary: accepted?.summary ?? reviewedSummary ?? repairSummary ?? `Review and refine ${code}.`,
        suggestedPath: accepted?.suggestedPath ?? reviewedPath ?? repairPath ?? locationFile ?? TARGET.appPath,
        status,
        ...((accepted?.rationale ?? reviewedRationale) ? { rationale: accepted?.rationale ?? reviewedRationale! } : {}),
      }, locationFile);
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

function buildChatMessages(session: ContractSessionFile): LocalWorkbenchChatMessage[] {
  if (session.chat.length === 0) {
    return [
      buildContractSummaryMessage(session.workingContract),
      {
        id: "empty-chat",
        role: "assistant",
        title: "Contract shaper",
        content: "Send a designer instruction to shape the working contract before the next rerun.",
        createdAt: session.updatedAt,
      },
    ];
  }

  return [buildContractSummaryMessage(session.workingContract), ...session.chat];
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

async function mirrorSandboxNodeModules(sandboxRoot: string): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();
  const links = [
    {
      source: path.join(workspaceRoot, "node_modules"),
      target: path.join(sandboxRoot, "node_modules"),
    },
    {
      source: path.join(resolveTargetAppPath(), "node_modules"),
      target: path.join(sandboxRoot, TARGET.appPath, "node_modules"),
    },
  ];

  for (const { source, target } of links) {
    if (!fs.existsSync(source)) {
      continue;
    }
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.rm(target, { recursive: true, force: true });
    await fsp.symlink(source, target, "junction");
  }
}

async function createSandbox(runId: string, label: string): Promise<string> {
  const sandboxRoot = path.join(resolveSandboxRoot(), runId, label);
  await fsp.mkdir(path.dirname(sandboxRoot), { recursive: true });
  await fsp.rm(sandboxRoot, { recursive: true, force: true });
  await runCommand("git", ["worktree", "add", "--detach", sandboxRoot, "HEAD"], {
    cwd: resolveWorkspaceRoot(),
  });
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

function withServerOutput(message: string, server: StartedReferenceTargetServer): string {
  const outputTail = server.getOutputTail();
  if (!outputTail) {
    return message;
  }
  return `${message}\n\nreference-target-web logs:\n${outputTail}`;
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

export function fatalServerResponseMessage(url: string, status: number, body: string): string | null {
  if (status < 500) {
    return null;
  }
  const excerpt = summarizeServerResponseBody(body);
  if (!excerpt) {
    return `reference-target-web dev server returned HTTP ${status} for ${url}.`;
  }
  return `reference-target-web dev server returned HTTP ${status} for ${url}: ${excerpt}`;
}

async function waitForUrlWithServerOutput(
  url: string,
  server: StartedReferenceTargetServer,
): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) {
      throw new Error(withServerOutput(`reference-target-web dev server exited before ${url} became ready.`, server));
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      const fatalResponse = fatalServerResponseMessage(url, response.status, await response.text());
      if (fatalResponse) {
        throw new Error(withServerOutput(fatalResponse, server));
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("reference-target-web dev server returned HTTP")) {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(withServerOutput(`Timed out waiting for ${url}.`, server));
}

async function startReferenceTargetServer(workspaceRoot: string, port: number): Promise<StartedReferenceTargetServer> {
  const child = spawn(
    "pnpm",
    ["exec", "next", "dev", "--port", String(port), "--hostname", "127.0.0.1", "--webpack"],
    {
      cwd: path.join(workspaceRoot, TARGET.appPath),
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.stderr.write(`reference-target-web dev server exited early (${code}): ${stderr}\n`);
    }
  });
  const server = {
    child,
    getOutputTail: () => formatProcessOutputTail(stdout, stderr),
  } satisfies StartedReferenceTargetServer;
  await waitForUrlWithServerOutput(`http://127.0.0.1:${port}`, server);
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

export function buildAssessmentPayload(notes: string, touchedFiles: string[]) {
  return {
    structure: "partial",
    components: "partial",
    boundary: "partial",
    visual: "partial",
    responsiveness: "partial",
    notes,
    touchedFiles,
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
  return readJsonFile<RunRecordFile>(recordPath);
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
    transcriptPath: record.transcriptPath,
    touchedFiles: record.touchedFiles,
    errorMessage: record.errorMessage,
    effectiveContractPath: record.effectiveContractPath,
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

export async function loadLocalWorkbenchData(): Promise<LocalWorkbenchData> {
  const session = await loadOrInitContractSession();
  const contract = summarizeContract(session.workingContract);
  const records = await listRunRecords();
  const activeAcceptedSuggestions = await loadAcceptedSuggestions();
  const runs = await Promise.all(records.map((record) => buildRunView(record)));
  const latestRun = runs[0] ?? null;
  const latestRunOperatorNote = buildEditedUnresolvedAcceptedSuggestionMessage(latestRun, activeAcceptedSuggestions);
  const latestRunAgentInput: LocalWorkbenchAgentInput = {
    path: latestRun?.agentInputPath ?? null,
    content: await readTextFile(latestRun?.agentInputPath ?? null),
  };
  return {
    enabled: true,
    runRoot: resolveSurfaceRoot(),
    target: {
      id: TARGET.id,
      label: TARGET.label,
      appRoot: resolveTargetAppPath(),
      contractPath: resolveTargetContractPath(),
      implementationBrief: TARGET.implementationBrief,
    },
    contract,
    latestRun,
    runs,
    activeAcceptedSuggestions,
    latestRunOperatorNote,
    activeContractChanges: session.activeContractChanges,
    activeDesignerNotes: session.activeDesignerNotes,
    latestRunAgentInput,
    chat: buildChatMessages(session),
    localModel: {
      configured: true,
      baseUrl: resolveLocalLlmConfig().baseUrl,
      model: resolveLocalLlmConfig().model,
    },
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
  const canonicalContract = await readJsonFile<ContractDocument>(session.canonicalContractPath);
  const result = await shapeLocalWorkbenchContract({
    config: resolveLocalLlmConfig(),
    message: trimmedMessage,
    contractSummary: contractSummaryText(session.workingContract),
    activeDesignerNotes: session.activeDesignerNotes,
  });

  const nextContract = cloneContract(session.workingContract);
  let nextActiveContractChanges = [...session.activeContractChanges];
  for (const change of result.contractChanges) {
    applyContractChange(nextContract, change);
    nextActiveContractChanges = mergeActiveContractChange(
      nextActiveContractChanges,
      canonicalContract,
      sourceMessageId,
      now,
      change,
    );
  }

  const nextSession = {
    ...session,
    updatedAt: now,
    workingContract: nextContract,
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
        title: "Contract shaper",
        content: result.assistantMessage,
        createdAt: now,
      },
    ],
    activeContractChanges: nextActiveContractChanges,
    activeDesignerNotes: appendDesignerNotes(session.activeDesignerNotes, result.designerNotes, sourceMessageId, now),
  } satisfies ContractSessionFile;

  await writeContractSession(nextSession);
}

async function updateRunRecord(runId: string, update: Partial<RunRecordFile>): Promise<void> {
  const existing = await loadRunRecord(runId);
  if (!existing) {
    throw new Error(`Run ${runId} not found.`);
  }
  await writeJsonFile(resolveRunRecordPath(runId), { ...existing, ...update });
}

async function writeRunExplainability(input: {
  runId: string;
  explainabilityPath: string;
  effectiveContractPath: string | null;
  agentInputPath: string | null;
  activeContractChanges: LocalWorkbenchContractChange[];
  activeDesignerNotes: LocalWorkbenchDesignerNote[];
}): Promise<void> {
  await writeJsonFile(input.explainabilityPath, {
    schemaVersion: 1,
    runId: input.runId,
    createdAt: new Date().toISOString(),
    effectiveContractPath: input.effectiveContractPath,
    agentInputPath: input.agentInputPath,
    activeContractChanges: input.activeContractChanges,
    activeDesignerNotes: input.activeDesignerNotes,
  } satisfies RunExplainabilityFile);
}

export async function startLocalWorkbenchRerun(): Promise<StartLocalRerunResult> {
  const llm = resolveLocalLlmConfig();
  const session = await loadOrInitContractSession();
  const activeAcceptedSuggestions = await loadAcceptedSuggestions();

  const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const runDir = resolveRunDirectory(runId);
  const bundleRoot = path.join(runDir, "bundle");
  const preparedPath = path.join(runDir, "prepared-input.json");
  const sessionsRoot = path.join(runDir, "sessions");
  const transcriptPath = path.join(runDir, "agent-trace.json");
  const effectiveContractPath = path.join(runDir, "effective-contract.json");
  const agentInputPath = path.join(runDir, "agent-input.txt");
  const explainabilityPath = path.join(runDir, "explainability.json");

  await fsp.mkdir(runDir, { recursive: true });
  await writeJsonFile(effectiveContractPath, session.workingContract);
  await writeJsonFile(resolveRunRecordPath(runId), {
    schemaVersion: 1,
    runId,
    status: "running",
    createdAt: new Date().toISOString(),
    completedAt: null,
    contractPath: effectiveContractPath,
    preparedInputPath: preparedPath,
    baselineSessionDir: null,
    currentSessionDir: null,
    baselinePreviewPath: null,
    currentPreviewPath: null,
    baselineSummaryPath: null,
    currentSummaryPath: null,
    comparisonPath: null,
    suggestionsPath: null,
    transcriptPath,
    effectiveContractPath,
    agentInputPath,
    explainabilityPath,
    touchedFiles: [],
    errorMessage: null,
  } satisfies RunRecordFile);

  const baselineSandbox = await createSandbox(runId, "baseline");
  const currentSandbox = await createSandbox(runId, "current");

  try {
    await runInterfacectlCli(
      ["compile", "--contract", effectiveContractPath, "--out", bundleRoot],
      { cwd: resolveWorkspaceRoot() },
    );
    await runInterfacectlCli(
      ["prepare-generation", "--bundle-root", bundleRoot, "--surface", TARGET.id, "--out", preparedPath],
      { cwd: resolveWorkspaceRoot() },
    );

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
    await updateRunRecord(runId, { baselineSessionDir, currentSessionDir });

    const baselineAssessmentPath = path.join(runDir, "baseline.assessment.json");
    await writeJsonFile(
      baselineAssessmentPath,
      buildAssessmentPayload("Baseline snapshot before local agent edits.", []),
    );
    const baselinePort = await getAvailablePort();
    const baselineServer = await startReferenceTargetServer(baselineSandbox, baselinePort);
    try {
      await runInterfacectlCli(
        ["record-generation-attempt", "--session-dir", baselineSessionDir, "--assessment-file", baselineAssessmentPath],
        { cwd: baselineSandbox },
      );
      await runInterfacectlCli(
        [
          "capture-generation-preview",
          "--session-dir",
          baselineSessionDir,
          "--attempt",
          "1",
          "--url",
          `http://127.0.0.1:${baselinePort}`,
        ],
        { cwd: baselineSandbox },
      );
      await runInterfacectlCli(
        ["summarize-generation-session", "--session-dir", baselineSessionDir],
        { cwd: baselineSandbox, acceptExitCodes: [30] },
      );
    } catch (error) {
      throw new Error(withServerOutput(error instanceof Error ? error.message : String(error), baselineServer));
    } finally {
      await stopServer(baselineServer.child);
    }

    const agentResult = await runLocalLlmAgent({
      config: llm,
      repoRoot: currentSandbox,
      allowedRoots: [TARGET.appPath],
      preparedPayload,
      implementationBrief: TARGET.implementationBrief,
      acceptedSuggestions: activeAcceptedSuggestions,
      effectiveContractSummary: contractSummaryText(session.workingContract),
      activeDesignerNotes: session.activeDesignerNotes,
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
      runId,
      explainabilityPath,
      effectiveContractPath,
      agentInputPath,
      activeContractChanges: session.activeContractChanges,
      activeDesignerNotes: session.activeDesignerNotes,
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

    const currentPort = await getAvailablePort();
    const currentServer = await startReferenceTargetServer(currentSandbox, currentPort);
    try {
      await runInterfacectlCli(
        ["record-generation-attempt", "--session-dir", currentSessionDir, "--assessment-file", currentAssessmentPath],
        { cwd: currentSandbox },
      );
      await runInterfacectlCli(
        [
          "capture-generation-preview",
          "--session-dir",
          currentSessionDir,
          "--attempt",
          "1",
          "--url",
          `http://127.0.0.1:${currentPort}`,
        ],
        { cwd: currentSandbox },
      );
      await runInterfacectlCli(
        ["summarize-generation-session", "--session-dir", currentSessionDir],
        { cwd: currentSandbox, acceptExitCodes: [30] },
      );
    } catch (error) {
      throw new Error(withServerOutput(error instanceof Error ? error.message : String(error), currentServer));
    } finally {
      await stopServer(currentServer.child);
    }

    const baselineValidate = await readJsonFile<Record<string, unknown>>(
      path.join(baselineSessionDir, "attempts", `${RERUN_ATTEMPT}.validate.json`),
    );
    const currentValidate = await readJsonFile<Record<string, unknown>>(
      path.join(currentSessionDir, "attempts", `${RERUN_ATTEMPT}.validate.json`),
    );
    const remainingAcceptedSuggestions = pruneAcceptedSuggestions(activeAcceptedSuggestions, currentValidate);
    await writeAcceptedSuggestions(remainingAcceptedSuggestions);
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

    const baselinePreviewPath = path.join(baselineSessionDir, "attempts", `${RERUN_ATTEMPT}.preview.png`);
    const currentPreviewPath = path.join(currentSessionDir, "attempts", `${RERUN_ATTEMPT}.preview.png`);
    const baselineSummaryPath = path.join(baselineSessionDir, "summary.json");
    const currentSummaryPath = path.join(currentSessionDir, "summary.json");

    const noOpAcceptedFailure = unresolvedAcceptedSuggestionNoopErrorMessage(
      agentResult.noChanges,
      remainingAcceptedSuggestions,
      currentValidate,
    );
    if (noOpAcceptedFailure) {
      await updateRunRecord(runId, {
        baselinePreviewPath,
        currentPreviewPath,
        baselineSummaryPath,
        currentSummaryPath,
        comparisonPath,
        suggestionsPath,
        effectiveContractPath,
        agentInputPath,
        explainabilityPath,
        touchedFiles: agentResult.touchedFiles,
      });
      throw new Error(noOpAcceptedFailure);
    }

    await updateRunRecord(runId, {
      status: "succeeded",
      completedAt: new Date().toISOString(),
      baselinePreviewPath,
      currentPreviewPath,
      baselineSummaryPath,
      currentSummaryPath,
      comparisonPath,
      suggestionsPath,
      effectiveContractPath,
      agentInputPath,
      explainabilityPath,
      touchedFiles: agentResult.touchedFiles,
    });
    return { runId, status: "succeeded" };
  } catch (error) {
    await updateRunRecord(runId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : String(error),
    }).catch(() => undefined);
    return { runId, status: "failed" };
  } finally {
    await removeSandbox(currentSandbox).catch(() => undefined);
    await removeSandbox(baselineSandbox).catch(() => undefined);
  }
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
