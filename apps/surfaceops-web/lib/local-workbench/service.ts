import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { runInterfacectlCli, resolveWorkspaceRoot } from "@/lib/interfacectl";
import { runLocalLlmAgent, type LocalLlmConfig } from "./local-llm";
import type {
  LocalSuggestionStatus,
  LocalWorkbenchChatMessage,
  LocalWorkbenchComparison,
  LocalWorkbenchData,
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
const DEFAULT_LOCAL_LLM_MODEL = "openai/gpt-oss-20b";

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
  touchedFiles: string[];
  errorMessage: string | null;
}

interface ContractDocument {
  contractId?: string;
  version?: string;
  description?: string;
  sections?: Array<{ id?: string }>;
  color?: { policy?: string };
  surfaces?: Array<{
    id?: string;
    allowedFonts?: string[];
    layout?: { maxContentWidth?: number };
    requiredSections?: string[];
  }>;
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
  };
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

function suggestionSummaryFromRun(
  preparedPayload: Record<string, unknown>,
  validatePayload: Record<string, unknown>,
  reviewedPayload?: Record<string, unknown> | null,
): LocalWorkbenchSuggestion[] {
  const repairMap = Array.isArray((preparedPayload.repairMap as { repairs?: unknown } | undefined)?.repairs)
    ? (((preparedPayload.repairMap as { repairs?: unknown }).repairs) as Array<Record<string, unknown>>)
    : [];
  const reviewedSuggestions = Array.isArray(reviewedPayload?.suggestions) ? reviewedPayload.suggestions : [];
  const reviewedIndex = new Map<string, Record<string, unknown>>();
  for (const suggestion of reviewedSuggestions) {
    if (suggestion && typeof suggestion === "object") {
      reviewedIndex.set(String((suggestion as Record<string, unknown>).suggestionId ?? ""), suggestion as Record<string, unknown>);
    }
  }
  const findings = Array.isArray(validatePayload.findings) ? validatePayload.findings : [];
  return findings
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
    .map((finding, index) => {
      const code = String(finding.code ?? `finding-${index + 1}`);
      const repair = repairMap.find((entry) => entry.code === code) ?? null;
      const suggestionId = `suggestion-${index + 1}`;
      const reviewed = reviewedIndex.get(suggestionId);
      return {
        suggestionId,
        findingCode: code,
        findingMessage: String(finding.message ?? code),
        summary: repair ? String(repair.summary ?? repair.code ?? code) : `Review and refine ${code}.`,
        suggestedPath: repair ? String(repair.path ?? TARGET.appPath) : TARGET.appPath,
        status: (reviewed ? String(reviewed.status ?? "proposed") : "proposed") as LocalSuggestionStatus,
        ...(reviewed && typeof reviewed.rationale === "string" ? { rationale: reviewed.rationale } : {}),
      };
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

function buildChatMessages(data: {
  contract: LocalWorkbenchData["contract"];
  latestRun: LocalWorkbenchRun | null;
}): LocalWorkbenchChatMessage[] {
  const messages: LocalWorkbenchChatMessage[] = [
    {
      id: "contract",
      role: "system",
      title: "Contract summary",
      content: [
        `${data.contract.contractId} v${data.contract.version}`,
        data.contract.description || "Reference target contract loaded for the local workbench.",
        `Required sections: ${data.contract.requiredSections.join(", ") || "none recorded"}`,
        `Fonts: ${data.contract.allowedFonts.join(", ") || "none recorded"}`,
      ].join("\n"),
    },
  ];
  if (!data.latestRun) {
    messages.push({
      id: "empty",
      role: "assistant",
      title: "No rerun yet",
      content: "Run the local LLM once to capture baseline/current previews, validation, and suggestion summaries.",
    });
    return messages;
  }
  const comparison = data.latestRun.comparison;
  messages.push({
    id: "run",
    role: "assistant",
    title: "Latest run",
    content: [
      `Status: ${data.latestRun.status}`,
      comparison
        ? `Baseline ${comparison.baselineStatus} -> Current ${comparison.currentStatus}; finding delta ${comparison.findingCountDelta}.`
        : "Comparison metrics unavailable.",
      data.latestRun.touchedFiles.length > 0
        ? `Touched files: ${data.latestRun.touchedFiles.join(", ")}`
        : "No implementation files changed.",
    ].join("\n"),
  });
  if (data.latestRun.suggestions[0]) {
    messages.push({
      id: "suggestions",
      role: "assistant",
      title: "Top suggestions",
      content: data.latestRun.suggestions
        .slice(0, 3)
        .map((suggestion) => `${suggestion.findingCode}: ${suggestion.summary}`)
        .join("\n"),
    });
  }
  return messages;
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

async function waitForUrl(url: string): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function startReferenceTargetServer(workspaceRoot: string, port: number): Promise<ChildProcess> {
  const child = spawn(
    "pnpm",
    ["exec", "next", "dev", "--port", String(port), "--hostname", "127.0.0.1", "--webpack"],
    {
      cwd: path.join(workspaceRoot, TARGET.appPath),
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stderr = "";
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.stderr.write(`reference-target-web dev server exited early (${code}): ${stderr}\n`);
    }
  });
  await waitForUrl(`http://127.0.0.1:${port}`);
  return child;
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

function buildAssessmentPayload(notes: string, touchedFiles: string[]) {
  return {
    structure: "partial",
    visual: "partial",
    responsiveness: "partial",
    notes,
    touchedFiles,
  };
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
  const suggestions = preparedPayload && currentValidate
    ? suggestionSummaryFromRun(preparedPayload, currentValidate, reviewedSuggestions)
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
  const contract = summarizeContract(await readJsonFile<ContractDocument>(resolveTargetContractPath()));
  const records = await listRunRecords();
  const runs = await Promise.all(records.map((record) => buildRunView(record)));
  const latestRun = runs[0] ?? null;
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
    chat: buildChatMessages({ contract, latestRun }),
    localModel: {
      configured: true,
      baseUrl: resolveLocalLlmConfig().baseUrl,
      model: resolveLocalLlmConfig().model,
    },
  };
}

async function updateRunRecord(runId: string, update: Partial<RunRecordFile>): Promise<void> {
  const existing = await loadRunRecord(runId);
  if (!existing) {
    throw new Error(`Run ${runId} not found.`);
  }
  await writeJsonFile(resolveRunRecordPath(runId), { ...existing, ...update });
}

export async function startLocalWorkbenchRerun(): Promise<StartLocalRerunResult> {
  const llm = resolveLocalLlmConfig();

  const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const runDir = resolveRunDirectory(runId);
  const bundleRoot = path.join(runDir, "bundle");
  const preparedPath = path.join(runDir, "prepared-input.json");
  const sessionsRoot = path.join(runDir, "sessions");
  const transcriptPath = path.join(runDir, "agent-trace.json");

  await fsp.mkdir(runDir, { recursive: true });
  await writeJsonFile(resolveRunRecordPath(runId), {
    schemaVersion: 1,
    runId,
    status: "running",
    createdAt: new Date().toISOString(),
    completedAt: null,
    contractPath: resolveTargetContractPath(),
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
    touchedFiles: [],
    errorMessage: null,
  } satisfies RunRecordFile);

  const baselineSandbox = await createSandbox(runId, "baseline");
  const currentSandbox = await createSandbox(runId, "current");

  try {
    await runInterfacectlCli(
      ["compile", "--contract", resolveTargetContractPath(), "--out", bundleRoot],
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
    } finally {
      await stopServer(baselineServer);
    }

    const agentResult = await runLocalLlmAgent({
      config: llm,
      repoRoot: currentSandbox,
      allowedRoots: [TARGET.appPath],
      preparedPayload,
      implementationBrief: TARGET.implementationBrief,
    });
    await writeJsonFile(transcriptPath, agentResult.transcript);

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
    } finally {
      await stopServer(currentServer);
    }

    const baselineValidate = await readJsonFile<Record<string, unknown>>(
      path.join(baselineSessionDir, "attempts", `${RERUN_ATTEMPT}.validate.json`),
    );
    const currentValidate = await readJsonFile<Record<string, unknown>>(
      path.join(currentSessionDir, "attempts", `${RERUN_ATTEMPT}.validate.json`),
    );
    const comparison = buildComparison(baselineValidate, currentValidate);
    const comparisonPath = path.join(runDir, "comparison.json");
    await writeJsonFile(comparisonPath, comparison);

    const suggestionsPath = path.join(runDir, "suggestions.json");
    await writeJsonFile(suggestionsPath, {
      runId,
      suggestions: suggestionSummaryFromRun(preparedPayload, currentValidate),
    });

    const baselinePreviewPath = path.join(baselineSessionDir, "attempts", `${RERUN_ATTEMPT}.preview.png`);
    const currentPreviewPath = path.join(currentSessionDir, "attempts", `${RERUN_ATTEMPT}.preview.png`);
    const baselineSummaryPath = path.join(baselineSessionDir, "summary.json");
    const currentSummaryPath = path.join(currentSessionDir, "summary.json");

    await updateRunRecord(runId, {
      status: "succeeded",
      completedAt: new Date().toISOString(),
      baselinePreviewPath,
      currentPreviewPath,
      baselineSummaryPath,
      currentSummaryPath,
      comparisonPath,
      suggestionsPath,
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
}
