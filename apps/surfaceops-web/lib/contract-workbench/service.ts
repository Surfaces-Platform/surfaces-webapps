import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  getGitHubFileText,
  getGitHubRepoIdentity,
  listGitHubRepos,
  cloneGitHubRepo,
  createBranchCommitAndPush,
  createGitHubPullRequest,
} from "./github";
import { runInterfacectlCli } from "./interfacectl";
import {
  mergePreviewCookieIntoStorageState,
  parseVercelBypassCookie,
} from "./preview-auth";
import {
  createContractProject,
  createContractProjectRun,
  createProjectPublish,
  getAuthSession,
  getContractProject,
  getContractProjectDraft,
  getContractProjectRun,
  getGitHubToken,
  hasAuthSession,
  listContractProjectRuns,
  listContractProjects,
  listProjectPublishes,
  saveAuthSession,
  saveContractProjectDraft,
  updateContractProjectRun,
  updateProjectPublish,
} from "./store";
import { resolveBlobRef, writeArtifactTree } from "./blob-store";
import { loadGenerationWorkbenchFromRoot } from "@/lib/generation-benchmarks";
import type {
  AttemptView,
  GenerationWorkbenchData,
} from "@/lib/generation-benchmarks";
import type {
  ContractProjectInput,
  ContractProjectRecord,
  ContractProjectSurface,
  ContractWorkbenchPanel,
  ProjectWorkspaceData,
  PublishRequestInput,
  RerunRequestInput,
  SuggestionDecisionInput,
} from "./types";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stringifyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function parseJsonObject(raw: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function assertNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function resolveSurfaceBrief(surface: ContractProjectSurface): string {
  return surface.implementationBrief.trim();
}

function defaultSurfacesFromContract(contractJson: Record<string, unknown>) {
  const surfaces = Array.isArray(contractJson.surfaces) ? contractJson.surfaces : [];
  return surfaces.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }
    const surface = entry as Record<string, unknown>;
    const id = typeof surface.id === "string" ? surface.id.trim() : "";
    if (!id) {
      return [];
    }
    const label = typeof surface.displayName === "string" && surface.displayName.trim()
      ? surface.displayName.trim()
      : undefined;
    return [{
      id,
      ...(label ? { label } : {}),
      implementationBrief: `Implement ${label ?? id} to match the connected product surface while respecting the current contract.`,
    }];
  });
}

function resolvePreviewTarget(
  project: ContractProjectRecord,
  surfaceId: string,
  branchName: string,
): { url: string; waitFor?: string; authSessionKey?: string } {
  const target = project.previewTargets.find((entry) => entry.surfaceId === surfaceId);
  if (!target) {
    throw new Error(`Preview target for surface ${surfaceId} is not configured.`);
  }
  const url = target.urlTemplate ? target.urlTemplate.replaceAll("{branch}", branchName) : target.url;
  return {
    url,
    ...(target.waitFor ? { waitFor: target.waitFor } : {}),
    ...(target.authSessionKey ? { authSessionKey: target.authSessionKey } : {}),
  };
}

function repoCacheRoot(): string {
  if (process.env.SURFACEOPS_REPO_CLONE_ROOT?.trim()) {
    return path.resolve(process.env.SURFACEOPS_REPO_CLONE_ROOT);
  }
  return path.join(os.tmpdir(), "surfaceops-reruns");
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
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            [`${command} ${args.join(" ")} exited with code ${code}.`, stderr.trim(), stdout.trim()]
              .filter(Boolean)
              .join("\n"),
          ),
        );
        return;
      }
      resolve({ stdout, stderr });
    });
    if (options.stdinText) {
      child.stdin.write(options.stdinText);
    }
    child.stdin.end();
  });
}

async function getTouchedFiles(repoDir: string): Promise<string[]> {
  const result = await runCommand("git", ["status", "--short"], { cwd: repoDir });
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[A-Z? ]+/, "").trim())
    .filter(Boolean);
}

function assessmentGradeForStatus(status: string): "strong" | "partial" | "weak" {
  if (status === "pass") {
    return "strong";
  }
  if (status === "warn") {
    return "partial";
  }
  return "weak";
}

async function writeAssessmentFile(
  filePath: string,
  status: string,
  touchedFiles: string[],
  notes: string,
): Promise<void> {
  const grade = assessmentGradeForStatus(status);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(
    filePath,
    stringifyJson({
      structure: grade,
      components: grade,
      boundary: grade,
      visual: grade,
      responsiveness: grade,
      notes,
      touchedFiles,
    }),
    "utf8",
  );
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fsp.readFile(filePath, "utf8")) as T;
}

function vercelScope(): string {
  return process.env.SURFACEOPS_VERCEL_SCOPE?.trim() || "surfaces-platform";
}

function previewPathFromUrl(url: string): string {
  const target = new URL(url);
  return `${target.pathname}${target.search}`;
}

async function requestVercelBypassCookie(url: string): Promise<string> {
  const target = new URL(url);
  const result = await runCommand(
    "vercel",
    [
      "curl",
      previewPathFromUrl(url),
      "--deployment",
      target.origin,
      "--scope",
      vercelScope(),
      "--",
      "--dump-header",
      "-",
      "--silent",
      "--output",
      os.devNull,
      "-H",
      "x-vercel-set-bypass-cookie: true",
    ],
    { cwd: process.cwd() },
  );
  return result.stdout;
}

async function createPreviewStorageStatePath(input: {
  previewUrl: string;
  baseStorageStatePath?: string | null;
}): Promise<string> {
  let baseState: Record<string, unknown> | null = null;
  if (input.baseStorageStatePath) {
    baseState = await readJsonFile<Record<string, unknown>>(input.baseStorageStatePath);
  }
  const cookie = parseVercelBypassCookie(
    await requestVercelBypassCookie(input.previewUrl),
    input.previewUrl,
  );
  const storageState = mergePreviewCookieIntoStorageState(baseState, cookie);
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-preview-auth-"));
  const storageStatePath = path.join(tempDir, "storage-state.json");
  await fsp.writeFile(storageStatePath, stringifyJson(storageState), "utf8");
  return storageStatePath;
}

async function waitForPreview(url: string): Promise<void> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      await requestVercelBypassCookie(url);
      return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(`Preview ${url} did not become ready before timeout.`);
}

async function runCodexPrompt(repoDir: string, prompt: string): Promise<void> {
  await runCommand(
    "codex",
    [
      "exec",
      "-",
      "-C",
      repoDir,
      "--dangerously-bypass-approvals-and-sandbox",
      "--color",
      "never",
    ],
    {
      cwd: repoDir,
      stdinText: prompt,
    },
  );
}

function buildGenerationPrompt(input: {
  surfaceId: string;
  brief: string;
  guidanceMode: "unguided" | "prepared";
  preparedInputPath?: string | null;
  contractPath: string;
}): string {
  return [
    `You are editing a web product repository for the surface "${input.surfaceId}".`,
    `Implementation brief:\n${input.brief}`,
    "Work from the existing implementation in this repository. Prefer the smallest implementation-only changes that satisfy the brief.",
    input.guidanceMode === "prepared"
      ? `Use the prepared generation payload at ${input.preparedInputPath} as the primary contract-derived guidance.`
      : "Do not use any prepared-generation payload or raw contract guidance beyond the task brief.",
    `The canonical contract file in this workspace is ${input.contractPath}.`,
    `Do not edit ${input.contractPath}.`,
    "Do not add plans, design docs, or other new documentation unless the task explicitly requires them.",
    "Modify repository implementation files directly. Do not commit changes. Finish when the implementation is complete.",
  ].join("\n\n");
}

function buildSuggestionApplyPrompt(input: {
  suggestion: Record<string, unknown>;
  contractPath: string;
}): string {
  return [
    `Update ${input.contractPath} to incorporate the accepted contract refinement suggestion below.`,
    "Preserve valid JSON. Edit only the contract file.",
    JSON.stringify(input.suggestion, null, 2),
  ].join("\n\n");
}

async function runOneGuidanceArm(input: {
  workspaceId: string;
  project: ContractProjectRecord;
  projectToken: string;
  draftText: string;
  runId: string;
  surface: ContractProjectSurface;
  benchmarkRoot: string;
  sourceBundleRoot: string;
  sourcePreparedPath?: string | null;
  guidanceMode: "unguided" | "prepared";
  baseBranch: string;
  authStorageStatePath?: string | null;
}): Promise<{
  branchName: string;
  sessionDir: string;
  summaryPath: string;
  previewUrl: string;
}> {
  const armName = input.guidanceMode === "prepared" ? "guided" : "baseline";
  const repoDir = path.join(repoCacheRoot(), input.project.projectId, input.runId, armName);
  await cloneGitHubRepo(
    input.project.githubOwner,
    input.project.githubRepo,
    input.projectToken,
    input.baseBranch,
    repoDir,
  );

  const branchName = `surfaceops-${input.project.projectId}-${input.runId}-${armName}`.replace(/[^a-zA-Z0-9._-]/g, "-");
  await fsp.writeFile(path.join(repoDir, input.project.contractPath), input.draftText, "utf8");

  const sessionArtifactsRoot = path.join(input.benchmarkRoot, "sessions");
  const briefPath = path.join(input.benchmarkRoot, "briefs", `${input.surface.id}.${armName}.md`);
  await fsp.mkdir(path.dirname(briefPath), { recursive: true });
  await fsp.writeFile(briefPath, `${input.surface.implementationBrief.trim()}\n`, "utf8");

  await runInterfacectlCli(
    [
      "init-generation-session",
      "--bundle-root",
      input.sourceBundleRoot,
      "--surface",
      input.surface.id,
      "--workspace-root",
      repoDir,
      "--tool",
      "codex",
      "--guidance-mode",
      input.guidanceMode,
      "--brief-file",
      briefPath,
      "--session",
      armName,
      "--artifacts-root",
      sessionArtifactsRoot,
    ],
    {
      cwd: repoDir,
    },
  );

  const sessionDir = path.join(sessionArtifactsRoot, input.surface.id, armName);
  const prompt = buildGenerationPrompt({
    surfaceId: input.surface.id,
    brief: resolveSurfaceBrief(input.surface),
    guidanceMode: input.guidanceMode,
    preparedInputPath: input.sourcePreparedPath ?? null,
    contractPath: input.project.contractPath,
  });
  await runCodexPrompt(repoDir, prompt);

  const touchedFiles = await getTouchedFiles(repoDir);
  const assessmentPath = path.join(sessionDir, "attempt-inputs", "001.assessment.json");
  await fsp.mkdir(path.dirname(assessmentPath), { recursive: true });
  await writeAssessmentFile(
    assessmentPath,
    "warn",
    touchedFiles,
    `${armName} rerun recorded automatically by SurfaceOps.`,
  );
  await runInterfacectlCli(
    [
      "record-generation-attempt",
      "--session-dir",
      sessionDir,
      "--assessment-file",
      assessmentPath,
    ],
    {
      cwd: repoDir,
    },
  );

  const preview = resolvePreviewTarget(input.project, input.surface.id, branchName);
  await createBranchCommitAndPush({
    repoDir,
    owner: input.project.githubOwner,
    repo: input.project.githubRepo,
    token: input.projectToken,
    branchName,
    commitMessage: `SurfaceOps rerun ${input.runId} (${armName})`,
  });
  await waitForPreview(preview.url);
  const previewStorageStatePath = await createPreviewStorageStatePath({
    previewUrl: preview.url,
    baseStorageStatePath: input.authStorageStatePath ?? null,
  });
  try {
    await runInterfacectlCli(
      [
        "capture-generation-preview",
        "--session-dir",
        sessionDir,
        "--attempt",
        "1",
        "--url",
        preview.url,
        ...(preview.waitFor ? ["--wait-for", preview.waitFor] : []),
        "--storage-state",
        previewStorageStatePath,
      ],
      { cwd: repoDir },
    );
  } finally {
    await fsp.rm(path.dirname(previewStorageStatePath), { recursive: true, force: true }).catch(() => undefined);
  }
  await runInterfacectlCli(
    [
      "summarize-generation-session",
      "--session-dir",
      sessionDir,
    ],
    { cwd: repoDir },
  );

  return {
    branchName,
    sessionDir,
    summaryPath: path.join(sessionDir, "summary.json"),
    previewUrl: preview.url,
  };
}

async function createBenchmarkRunArtifacts(input: {
  workspaceId: string;
  project: ContractProjectRecord;
  projectToken: string;
  draftText: string;
  runId: string;
  surface: ContractProjectSurface;
  baseBranch: string;
  authStorageState?: Record<string, unknown> | null;
}): Promise<{
  artifactRef: string;
  summary: Record<string, unknown>;
  previewUrl: string;
  baselineBranch: string;
  guidedBranch: string;
}> {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-benchmark-run-"));
  const benchmarkRoot = path.join(tempRoot, "benchmark");
  const bundleRoot = path.join(tempRoot, "bundle");
  const contractPath = path.join(tempRoot, path.basename(input.project.contractPath));
  const authStatePath = input.authStorageState
    ? path.join(tempRoot, "auth-storage-state.json")
    : null;
  await fsp.mkdir(benchmarkRoot, { recursive: true });
  await fsp.mkdir(bundleRoot, { recursive: true });
  await fsp.writeFile(contractPath, input.draftText, "utf8");
  if (authStatePath && input.authStorageState) {
    await fsp.writeFile(authStatePath, stringifyJson(input.authStorageState), "utf8");
  }

  await runInterfacectlCli(
    [
      "compile",
      "--contract",
      contractPath,
      "--out",
      bundleRoot,
    ],
    { cwd: tempRoot },
  );

  const preparedPath = path.join(tempRoot, "prepared-input.json");
  await runInterfacectlCli(
    [
      "prepare-generation",
      "--bundle-root",
      bundleRoot,
      "--surface",
      input.surface.id,
      "--out",
      preparedPath,
    ],
    { cwd: tempRoot },
  );

  const baseline = await runOneGuidanceArm({
    workspaceId: input.workspaceId,
    project: input.project,
    projectToken: input.projectToken,
    draftText: input.draftText,
    runId: input.runId,
    surface: input.surface,
    benchmarkRoot,
    sourceBundleRoot: bundleRoot,
    sourcePreparedPath: null,
    guidanceMode: "unguided",
    baseBranch: input.baseBranch,
    authStorageStatePath: authStatePath,
  });
  const guided = await runOneGuidanceArm({
    workspaceId: input.workspaceId,
    project: input.project,
    projectToken: input.projectToken,
    draftText: input.draftText,
    runId: input.runId,
    surface: input.surface,
    benchmarkRoot,
    sourceBundleRoot: bundleRoot,
    sourcePreparedPath: preparedPath,
    guidanceMode: "prepared",
    baseBranch: input.baseBranch,
    authStorageStatePath: authStatePath,
  });

  const comparisonDir = path.join(benchmarkRoot, "comparisons", input.surface.id);
  await runInterfacectlCli(
    [
      "compare-generation-sessions",
      "--baseline-session-dir",
      baseline.sessionDir,
      "--guided-session-dir",
      guided.sessionDir,
      "--out-dir",
      comparisonDir,
    ],
    { cwd: tempRoot },
  );
  const comparisonPath = path.join(comparisonDir, "comparison.json");

  const suggestionsPath = path.join(benchmarkRoot, "suggestions", `${input.surface.id}.json`);
  await fsp.mkdir(path.dirname(suggestionsPath), { recursive: true });
  await runInterfacectlCli(
    [
      "suggest-contract-deltas",
      "--session-dir",
      guided.sessionDir,
      "--out",
      suggestionsPath,
    ],
    { cwd: tempRoot },
  );
  const reportDir = path.join(benchmarkRoot, "report");
  await runInterfacectlCli(
    [
      "summarize-generation-benchmark",
      "--comparisons",
      comparisonPath,
      "--suggestions",
      suggestionsPath,
      "--out-dir",
      reportDir,
    ],
    { cwd: tempRoot },
  );

  const artifactRef = path.join(
    input.workspaceId,
    input.project.projectId,
    "runs",
    input.runId,
    "benchmark",
  );
  await writeArtifactTree(artifactRef, benchmarkRoot);
  const summary = await readJsonFile<Record<string, unknown>>(path.join(reportDir, "benchmark-report.json"));

  return {
    artifactRef,
    summary,
    previewUrl: guided.previewUrl,
    baselineBranch: baseline.branchName,
    guidedBranch: guided.branchName,
  };
}

export async function createConnectedProjectFromGithub(
  workspaceId: string,
  input: ContractProjectInput,
): Promise<ContractProjectRecord> {
  const githubOwner = assertNonEmptyString(input.githubOwner, "githubOwner");
  const githubRepo = assertNonEmptyString(input.githubRepo, "githubRepo");
  const githubToken = assertNonEmptyString(input.githubToken, "githubToken");
  const contractPath = assertNonEmptyString(input.contractPath, "contractPath");
  const repo = await getGitHubRepoIdentity(githubOwner, githubRepo, githubToken);
  const contractText = await getGitHubFileText(
    githubOwner,
    githubRepo,
    contractPath,
    input.githubDefaultBranch?.trim() || repo.defaultBranch,
    githubToken,
  );
  const contractJson = parseJsonObject(contractText, "canonical contract");
  const surfaces = input.surfaces?.length ? input.surfaces : defaultSurfacesFromContract(contractJson);
  return createContractProject({
    workspaceId,
    project: {
      ...input,
      githubOwner,
      githubRepo,
      githubDefaultBranch: input.githubDefaultBranch?.trim() || repo.defaultBranch,
      contractPath,
      surfaces,
    },
    githubToken,
    draftContractJson: contractJson,
  });
}

export async function discoverGithubRepos(token: string, owner?: string): Promise<string[]> {
  return listGitHubRepos(assertNonEmptyString(token, "githubToken"), owner?.trim());
}

export async function loadProjectWorkspace(
  workspaceId: string,
  projectId: string,
  options: {
    surfaceId?: string | null;
    runId?: string | null;
    panel?: string | null;
    attemptView?: string | null;
  } = {},
): Promise<ProjectWorkspaceData> {
  const project = await getContractProject(workspaceId, projectId);
  if (!project) {
    throw new Error(`Project ${projectId} not found.`);
  }
  const draft = await getContractProjectDraft(workspaceId, projectId);
  if (!draft) {
    throw new Error(`Draft for project ${projectId} not found.`);
  }
  const runs = await listContractProjectRuns(workspaceId, projectId);
  const publishes = await listProjectPublishes(workspaceId, projectId);
  const surfaces = project.surfaces;
  const selectedSurfaceId =
    surfaces.find((surface) => surface.id === options.surfaceId)?.id ??
    surfaces[0]?.id ??
    options.surfaceId ??
    "";
  const selectedRunId =
    runs.find((run) => run.runId === options.runId)?.runId ??
    project.latestRunId ??
    runs[0]?.runId ??
    null;
  const selectedPanel: ContractWorkbenchPanel =
    options.panel === "editor" || options.panel === "history" ? options.panel : "compare";
  const attemptView: AttemptView = options.attemptView === "first" ? "first" : "latest";
  const selectedRun = selectedRunId ? runs.find((run) => run.runId === selectedRunId) ?? null : null;
  const selectedRunWorkbench =
    selectedRun?.artifactRootRef
      ? loadGenerationWorkbenchFromRoot({
          benchmarkDir: resolveBlobRef(selectedRun.artifactRootRef),
          benchmarkId: selectedRun.runId,
          surfaceId: selectedSurfaceId,
          attemptView,
        })
      : null;
  const hasStoredSession = Boolean(
    project.previewTargets.some((target) => target.authSessionKey) &&
    await Promise.all(
      project.previewTargets
        .filter((target) => target.authSessionKey)
        .map((target) => hasAuthSession(workspaceId, projectId, target.authSessionKey!)),
    ).then((values) => values.some(Boolean)),
  );

  return {
    project,
    draft: {
      text: stringifyJson(draft.contractJson),
      sha256: draft.contractSha256,
      updatedAt: draft.updatedAt,
    },
    selectedSurfaceId,
    selectedRunId,
    selectedPanel,
    attemptView,
    runs,
    publishes,
    surfaces,
    previewTargets: project.previewTargets,
    selectedRunWorkbench,
    selectedRunSuggestionsPath:
      selectedRun?.artifactRootRef && selectedSurfaceId
        ? path.join(resolveBlobRef(selectedRun.artifactRootRef), "suggestions", `${selectedSurfaceId}.json`)
        : null,
    hasStoredAuthSession: hasStoredSession,
  };
}

export async function saveProjectDraftText(
  workspaceId: string,
  projectId: string,
  draftText: string,
): Promise<{ sha256: string; updatedAt: string }> {
  const contractJson = parseJsonObject(draftText, "draft contract");
  const draft = await saveContractProjectDraft({
    workspaceId,
    projectId,
    contractJson,
  });
  return {
    sha256: draft.contractSha256,
    updatedAt: draft.updatedAt,
  };
}

export async function saveProjectAuthSessionState(input: {
  workspaceId: string;
  projectId: string;
  authSessionKey: string;
  surfaceId: string;
  environmentId: string;
  previewOrigin: string;
  storageState: Record<string, unknown>;
  expiresAt?: string | null;
}): Promise<{ ok: true }> {
  await saveAuthSession(input);
  return { ok: true };
}

export async function createProjectRerun(
  workspaceId: string,
  projectId: string,
  input: RerunRequestInput,
): Promise<{ runId: string }> {
  const project = await getContractProject(workspaceId, projectId);
  if (!project) {
    throw new Error(`Project ${projectId} not found.`);
  }
  const draft = await getContractProjectDraft(workspaceId, projectId);
  if (!draft) {
    throw new Error(`Draft for project ${projectId} not found.`);
  }
  const surface = project.surfaces.find((entry) => entry.id === input.surfaceId);
  if (!surface) {
    throw new Error(`Surface ${input.surfaceId} is not configured for project ${projectId}.`);
  }
  const token = await getGitHubToken(workspaceId, projectId);
  const run = await createContractProjectRun({
    workspaceId,
    projectId,
    surfaceId: surface.id,
    baseBranch: input.branchBase?.trim() || project.githubDefaultBranch,
  });
  await updateContractProjectRun({
    workspaceId,
    projectId,
    runId: run.runId,
    status: "running",
  });

  try {
    const previewTarget = project.previewTargets.find((entry) => entry.surfaceId === surface.id);
    const authSession =
      previewTarget?.authSessionKey
        ? await getAuthSession(workspaceId, projectId, previewTarget.authSessionKey)
        : null;
    const artifacts = await createBenchmarkRunArtifacts({
      workspaceId,
      project,
      projectToken: token,
      draftText: stringifyJson(draft.contractJson),
      runId: run.runId,
      surface,
      baseBranch: run.baseBranch,
      authStorageState: authSession?.storageState ?? null,
    });
    await updateContractProjectRun({
      workspaceId,
      projectId,
      runId: run.runId,
      status: "succeeded",
      baselineBranch: artifacts.baselineBranch,
      guidedBranch: artifacts.guidedBranch,
      previewUrl: artifacts.previewUrl,
      artifactRootRef: artifacts.artifactRef,
      summaryJson: artifacts.summary,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    await updateContractProjectRun({
      workspaceId,
      projectId,
      runId: run.runId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : String(error),
      completedAt: new Date().toISOString(),
    });
    throw error;
  }

  return { runId: run.runId };
}

export async function publishProjectDraft(
  workspaceId: string,
  projectId: string,
  input: PublishRequestInput,
): Promise<{ publishId: string; pullRequestUrl: string | null }> {
  const project = await getContractProject(workspaceId, projectId);
  if (!project) {
    throw new Error(`Project ${projectId} not found.`);
  }
  const draft = await getContractProjectDraft(workspaceId, projectId);
  if (!draft) {
    throw new Error(`Draft for project ${projectId} not found.`);
  }
  const token = await getGitHubToken(workspaceId, projectId);
  const branchName = `surfaceops-${project.projectId}-${Date.now()}`;
  const publish = await createProjectPublish({ workspaceId, projectId, branchName });
  await updateProjectPublish({
    workspaceId,
    projectId,
    publishId: publish.publishId,
    status: "running",
  });

  try {
    const repoDir = path.join(repoCacheRoot(), project.projectId, "publishes", publish.publishId);
    await cloneGitHubRepo(project.githubOwner, project.githubRepo, token, project.githubDefaultBranch, repoDir);
    await fsp.writeFile(path.join(repoDir, project.contractPath), stringifyJson(draft.contractJson), "utf8");
    const commitSha = await createBranchCommitAndPush({
      repoDir,
      owner: project.githubOwner,
      repo: project.githubRepo,
      token,
      branchName,
      commitMessage: `SurfaceOps contract update for ${project.name}`,
    });
    const pr = await createGitHubPullRequest({
      owner: project.githubOwner,
      repo: project.githubRepo,
      token,
      title: input.title?.trim() || `SurfaceOps contract update for ${project.name}`,
      body: input.body?.trim() || "Automated contract update generated in SurfaceOps.",
      head: branchName,
      base: project.githubDefaultBranch,
    });
    const updated = await updateProjectPublish({
      workspaceId,
      projectId,
      publishId: publish.publishId,
      status: "succeeded",
      commitSha,
      pullRequestNumber: pr.number,
      pullRequestUrl: pr.url,
      completedAt: new Date().toISOString(),
    });
    return { publishId: updated.publishId, pullRequestUrl: updated.pullRequestUrl };
  } catch (error) {
    const updated = await updateProjectPublish({
      workspaceId,
      projectId,
      publishId: publish.publishId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : String(error),
      completedAt: new Date().toISOString(),
    });
    return { publishId: updated.publishId, pullRequestUrl: updated.pullRequestUrl };
  }
}

export async function reviewProjectSuggestion(
  workspaceId: string,
  projectId: string,
  suggestionId: string,
  input: SuggestionDecisionInput,
): Promise<{ updatedAt: string; draftSha256: string }> {
  const run = await getContractProjectRun(workspaceId, projectId, input.runId);
  if (!run?.artifactRootRef) {
    throw new Error(`Run ${input.runId} not found or does not contain artifacts.`);
  }
  const project = await getContractProject(workspaceId, projectId);
  if (!project) {
    throw new Error(`Project ${projectId} not found.`);
  }
  const draft = await getContractProjectDraft(workspaceId, projectId);
  if (!draft) {
    throw new Error(`Draft for project ${projectId} not found.`);
  }
  const suggestionsPath = path.join(resolveBlobRef(run.artifactRootRef), "suggestions", `${run.surfaceId}.json`);
  const reviewPath = path.join(os.tmpdir(), `surfaceops-suggestion-review-${randomUUID()}.json`);
  const reviewedPath = path.join(os.tmpdir(), `surfaceops-suggestion-reviewed-${randomUUID()}.json`);
  await fsp.writeFile(
    reviewPath,
    stringifyJson({
      decisions: [
        {
          suggestionId,
          status: input.decision,
          rationale: input.rationale,
        },
      ],
    }),
    "utf8",
  );
  await runInterfacectlCli(
    [
      "review-contract-delta-suggestions",
      "--suggestions",
      suggestionsPath,
      "--review-file",
      reviewPath,
      "--out",
      reviewedPath,
    ],
    { cwd: path.dirname(suggestionsPath) },
  );
  const reviewed = await readJsonFile<Record<string, unknown>>(reviewedPath);
  await fsp.copyFile(reviewedPath, suggestionsPath);

  if (input.decision === "accepted") {
    const suggestions = Array.isArray(reviewed.suggestions) ? reviewed.suggestions : [];
    const suggestion = suggestions.find((entry) => {
      return entry && typeof entry === "object" && (entry as Record<string, unknown>).suggestionId === suggestionId;
    });
    if (suggestion && typeof suggestion === "object") {
      const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "surfaceops-suggestion-apply-"));
      const contractPath = path.join(tempRoot, "contract.json");
      await fsp.writeFile(contractPath, stringifyJson(draft.contractJson), "utf8");
      await runCodexPrompt(
        tempRoot,
        buildSuggestionApplyPrompt({
          suggestion: suggestion as Record<string, unknown>,
          contractPath,
        }),
      );
      const updatedText = await fsp.readFile(contractPath, "utf8");
      await saveProjectDraftText(workspaceId, projectId, updatedText);
    }
  }

  const latestDraft = await getContractProjectDraft(workspaceId, projectId);
  return {
    updatedAt: latestDraft?.updatedAt ?? new Date().toISOString(),
    draftSha256: latestDraft?.contractSha256 ?? sha256(stringifyJson(draft.contractJson)),
  };
}

export async function listProjectsForWorkspace(workspaceId: string): Promise<ContractProjectRecord[]> {
  return listContractProjects(workspaceId);
}
