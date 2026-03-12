import { execSync } from "child_process";
import { createHash, randomUUID } from "crypto";
import {
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmdirSync,
  writeFileSync,
} from "fs";
import { dirname, join, resolve } from "path";
import { getPool } from "./db";
import { getDefaultWorkspaceId, normalizeWorkspaceId } from "./workspace";

const CONTRACTS_DIR = process.env.SURFACEOPS_CONTRACTS_DIR
  ? resolve(process.env.SURFACEOPS_CONTRACTS_DIR)
  : join(process.cwd(), "..", "..", "contracts");
const WORKSPACE_ROOT = join(CONTRACTS_DIR, "..");
const GENERATED_DIR = join(CONTRACTS_DIR, "generated");
const RUN_STORE_LOCK_PATH = join(GENERATED_DIR, "contract-runs.lock");
const RUN_STORE_LOCK_TIMEOUT_MS = 5_000;
const RUN_STORE_LOCK_POLL_MS = 25;

export interface GitLogEntry {
  hash: string;
  timestamp: number;
  relativeTime: string;
}

function runGitLog(filePath: string): GitLogEntry | null {
  try {
    const output = execSync(`git log -1 --format="%H %ct" -- "${filePath}"`, {
      cwd: WORKSPACE_ROOT,
      encoding: "utf-8",
    }).trim();
    if (!output) return null;
    const [hash, tsStr] = output.split(" ");
    const timestamp = parseInt(tsStr, 10);
    if (isNaN(timestamp) || !hash) return null;
    return {
      hash: hash.slice(0, 7),
      timestamp,
      relativeTime: formatRelativeTime(timestamp),
    };
  } catch {
    return null;
  }
}

function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

export function getLastContractChange(): GitLogEntry | null {
  return runGitLog("contracts/surfaces.web.contract.json");
}

export function getLastExtractionRun(surfaceId: string): GitLogEntry | null {
  return runGitLog(`contracts/generated/${surfaceId}.extraction.json`);
}

/**
 * Build metadata for drift-safety transparency.
 * SurfaceOps build sha from VERCEL_GIT_COMMIT_SHA when present.
 * interfacectl sha: unknown (TODO: inject at build time from the resolved interfacectl source if needed).
 */
export function getBuildMetadata(): {
  surfaceopsBuildSha: string;
  interfacectlSha: string;
} {
  const surfaceopsBuildSha =
    (typeof process !== "undefined" && process.env?.VERCEL_GIT_COMMIT_SHA) || "unknown";
  // TODO: Expose the resolved interfacectl source SHA at build time if needed; avoid git at runtime on Vercel.
  const interfacectlSha = "unknown";
  return { surfaceopsBuildSha: surfaceopsBuildSha.slice(0, 7), interfacectlSha };
}

export interface PolicySurface {
  id: string;
  displayName: string;
  type: string;
  domain?: string;
  owner?: string;
  phase0?: {
    authPosture?: string;
    requiresShell?: boolean;
    expectsAuthRoutes?: boolean;
    expectsDesignSystem?: boolean;
  };
}

export interface PolicyContract {
  contractId: string;
  version: string;
  surfaces: PolicySurface[];
}

export interface ExtractedSurface {
  surfaceId: string;
  appRoot: string;
  extracted: {
    authAware?: boolean;
    hasShell?: boolean;
    designSystemComponents?: string[];
    routes?: string[];
  };
  warnings?: { code: string; message: string }[];
  onboarding?: {
    sourceUrl?: string;
    authMode?: "none" | "browser-session";
    extractMode?: "remote-url" | "local-root";
    profileName?: string;
    profileDomain?: string;
    startedAt?: string;
    completedAt?: string;
    detection?: {
      adapter?: string;
      framework?: string;
      profile?: string;
    };
  };
}

export interface ActivatedSurface {
  id: string;
  displayName: string;
  domain?: string;
  owner?: string;
  inPolicyContract: boolean;
}

export function loadPolicyContract(): PolicyContract {
  const path = join(CONTRACTS_DIR, "surfaces.web.contract.json");
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as PolicyContract;
}

export function loadExtraction(surfaceId: string): ExtractedSurface | null {
  try {
    const path = join(GENERATED_DIR, `${surfaceId}.extraction.json`);
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as ExtractedSurface;
  } catch {
    return null;
  }
}

function listExtractionSurfaceIds(): string[] {
  if (!existsSync(GENERATED_DIR)) return [];
  const ids = readdirSync(GENERATED_DIR)
    .map((file) => {
      const match = file.match(/^(.+)\.extraction\.json$/);
      return match ? match[1] : null;
    })
    .filter((id): id is string => Boolean(id));
  return [...new Set(ids)].sort();
}

function readHostFromSourceUrl(sourceUrl?: string): string | undefined {
  if (!sourceUrl) return undefined;
  try {
    return new URL(sourceUrl).origin;
  } catch {
    return undefined;
  }
}

const SENSITIVE_QUERY_KEY = /(token|cookie|session|secret|key|jwt|auth|code|state)/i;

function sanitizeSourceUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEY.test(key)) {
        parsed.searchParams.set(key, "REDACTED");
      }
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function loadActivatedSurfaces(): ActivatedSurface[] {
  const policy = loadPolicyContract();
  const policyMap = new Map(policy.surfaces.map((surface) => [surface.id, surface] as const));
  const lineage = loadContractLineage();
  const fromLineage = Object.keys(lineage.surfaces);
  const fromExtraction = listExtractionSurfaceIds();
  const activatedIds = [...new Set([...fromLineage, ...fromExtraction])].sort();

  return activatedIds.map((id) => {
    const policySurface = policyMap.get(id);
    const extraction = loadExtraction(id);
    const onboardingUrl = extraction?.onboarding?.sourceUrl;
    const derivedDomain = readHostFromSourceUrl(onboardingUrl);
    return {
      id,
      displayName:
        policySurface?.displayName ??
        id
          .split("-")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
      domain: policySurface?.domain ?? derivedDomain,
      owner: policySurface?.owner,
      inPolicyContract: Boolean(policySurface),
    };
  });
}

export function getPolicyMembership(surfaceId: string): { inPolicyContract: boolean } {
  const contract = loadPolicyContract();
  return { inPolicyContract: contract.surfaces.some((surface) => surface.id === surfaceId) };
}

export function computeValidationStatus(
  surface: PolicySurface,
  extracted: ExtractedSurface | null
): "pass" | "fail" | "unknown" {
  if (!extracted) return "unknown";
  const phase0 = surface.phase0;
  if (!phase0) return "pass";

  if (phase0.expectsDesignSystem && !(extracted.extracted.designSystemComponents?.length ?? 0)) {
    return "fail";
  }
  if (phase0.requiresShell && extracted.extracted.hasShell === false) {
    return "fail";
  }
  if (phase0.expectsAuthRoutes) {
    const routes = extracted.extracted.routes ?? [];
    const required = ["/auth/login", "/auth/callback", "/auth/session", "/auth/logout"];
    if (required.some((r) => !routes.includes(r))) return "fail";
  }
  if (phase0.authPosture === "auth-aware" || phase0.authPosture === "auth-first") {
    if (!extracted.extracted.authAware) return "fail";
  }

  return "pass";
}

/**
 * Compute Phase 0 findings (same logic as interfacectl validate-extracted).
 * Returns structured failures for explainability.
 */
export function computeFindings(
  surface: PolicySurface,
  extracted: ExtractedSurface | null
): Phase0Finding[] {
  if (!extracted) return [];
  const phase0 = surface.phase0;
  if (!phase0) return [];

  const findings: Phase0Finding[] = [];
  const routes = extracted.extracted.routes ?? [];
  const routesSet = new Set(routes);
  const hasAllAuthRoutes = AUTH_ROUTES.every((r) => routesSet.has(r));
  const authAware = extracted.extracted.authAware ?? false;
  const hasShell = extracted.extracted.hasShell ?? false;
  const designSystemComponents = extracted.extracted.designSystemComponents ?? [];

  if (phase0.authPosture === "auth-first") {
    if (!authAware) {
      findings.push({
        surfaceId: surface.id,
        code: "phase0.authPosture.mismatch",
        category: "E2",
        message: "Contract expects auth-first but extracted authAware is false.",
        expected: "authAware true",
        found: authAware,
      });
    } else if (!hasAllAuthRoutes) {
      findings.push({
        surfaceId: surface.id,
        code: "phase0.authRoutes.missing",
        category: "E2",
        message:
          "Contract expects auth-first but extraction is missing one or more auth routes.",
        expected: AUTH_ROUTES,
        found: routes.filter((r) => AUTH_ROUTES.includes(r)),
      });
    }
  } else if (phase0.authPosture === "auth-aware") {
    if (!authAware) {
      findings.push({
        surfaceId: surface.id,
        code: "phase0.authPosture.mismatch",
        category: "E2",
        message: "Contract expects auth-aware but extracted authAware is false.",
        expected: "authAware true",
        found: authAware,
      });
    }
  }

  if (phase0.requiresShell === true && !hasShell) {
    findings.push({
      surfaceId: surface.id,
      code: "phase0.shell.mismatch",
      category: "E2",
      message: "Contract requires shell but extraction has hasShell false.",
      expected: true,
      found: hasShell,
    });
  }

  if (phase0.expectsAuthRoutes === true && !hasAllAuthRoutes) {
    const missing = AUTH_ROUTES.filter((r) => !routesSet.has(r));
    findings.push({
      surfaceId: surface.id,
      code: "phase0.authRoutes.missing",
      category: "E2",
      message: `Contract expects auth routes; missing: ${missing.join(", ")}.`,
      expected: AUTH_ROUTES,
      found: routes.filter((r) => AUTH_ROUTES.includes(r)),
    });
  }

  if (phase0.expectsDesignSystem === true && designSystemComponents.length === 0) {
    findings.push({
      surfaceId: surface.id,
      code: "phase0.designSystem.missing",
      category: "E2",
      message: "Contract expects design-system usage but extraction found none.",
      expected: "at least one component",
      found: designSystemComponents,
    });
  }

  return findings.sort((a, b) => {
    const catA = getFindingCategory(a.code);
    const catB = getFindingCategory(b.code);
    if (catA !== catB) return catA.localeCompare(catB);
    if (a.code !== b.code) return a.code.localeCompare(b.code);
    return (a.message ?? "").localeCompare(b.message ?? "");
  });
}

/** Map finding code to failure category for grouping. */
export function getFindingCategory(code: string): FailureCategory {
  if (code === "phase0.authPosture.mismatch" || code === "phase0.authRoutes.missing") {
    return code.includes("authRoutes") ? "auth-routes" : "auth-posture";
  }
  if (code === "phase0.shell.mismatch") return "shell";
  if (code === "phase0.designSystem.missing") return "design-system";
  return "auth-posture";
}

/** Group findings by category. */
export function groupFindingsByCategory(
  findings: Phase0Finding[]
): Record<FailureCategory, Phase0Finding[]> {
  const groups: Record<FailureCategory, Phase0Finding[]> = {
    "auth-posture": [],
    shell: [],
    "design-system": [],
    "auth-routes": [],
  };
  for (const f of findings) {
    const cat = getFindingCategory(f.code);
    groups[cat].push(f);
  }
  return groups;
}

/** Human-readable category label. */
export function getCategoryLabel(cat: FailureCategory): string {
  const labels: Record<FailureCategory, string> = {
    "auth-posture": "Auth posture",
    shell: "Shell",
    "design-system": "Design system",
    "auth-routes": "Auth routes",
  };
  return labels[cat];
}

/**
 * Derive drift label from outcome history (Phase 3B).
 * Only returns narrative labels (Newly failing / Regressed / Persistently failing)
 * when validation-outcomes.json exists and surface has at least 2 outcomes.
 * Otherwise returns "failing" when status is fail, or null.
 */
export function getDriftLabel(
  outcomes: ValidationOutcome[],
  hasSufficientHistory: boolean
): DriftLabelDisplay | null {
  if (outcomes.length === 0 || outcomes[0] !== "fail") return null;
  if (!hasSufficientHistory) return "failing";
  const hasEverPassed = outcomes.some((o) => o === "pass");
  const previousWasPass = outcomes[1] === "pass";
  if (previousWasPass) return "newly-failing";
  if (hasEverPassed) return "regressed";
  return "persistently-failing";
}

/** Human-readable drift label. */
export function getDriftLabelText(label: DriftLabelDisplay): string {
  const texts: Record<DriftLabelDisplay, string> = {
    "newly-failing": "Newly failing",
    regressed: "Regressed",
    "persistently-failing": "Persistently failing",
    failing: "Failing",
  };
  return texts[label];
}

const VALIDATION_OUTCOMES_PATH = join(GENERATED_DIR, "validation-outcomes.json");
const CONTRACT_RUNS_PATH = join(GENERATED_DIR, "contract-runs.json");
const CONTRACT_LINEAGE_PATH = join(GENERATED_DIR, "contract-lineage.json");
const MAX_OUTCOMES = 5;
const AUTH_ROUTES = ["/auth/login", "/auth/callback", "/auth/session", "/auth/logout"];

export type ValidationOutcome = "pass" | "warn" | "fail" | "unknown";
export type RunSource = "bootstrap" | "generation" | "ci" | "runtime";

export interface ContractRun {
  runId: string;
  workspaceId: string;
  idempotencyKey?: string;
  ingestedAt?: string;
  createdAt: string;
  surfaceId: string;
  source: RunSource;
  contract: {
    id: string;
    version: string;
    sha256: string;
  };
  artifacts: {
    extractionPath?: string;
    reportPath?: string;
  };
  status: ValidationOutcome;
  findingCodes: string[];
  summary: {
    errorCount: number;
    warnCount: number;
  };
}

export interface ContractRunsDocument {
  schemaVersion: number;
  runs: ContractRun[];
}

export interface ContractLineageRecord {
  lastRunId: string;
  lastRunAt: string;
  lastSource: RunSource;
  lastStatus: ValidationOutcome;
  contract: {
    id: string;
    version: string;
    sha256: string;
  };
  artifacts: {
    extractionPath?: string;
    reportPath?: string;
  };
  findingCodes: string[];
}

export interface ContractLineageDocument {
  schemaVersion: number;
  surfaces: Record<string, ContractLineageRecord>;
}

/** Phase 0 finding from validate-extracted logic. Same structure as interfacectl. */
export interface Phase0Finding {
  surfaceId: string;
  code: string;
  category: "E0" | "E2";
  message: string;
  expected?: unknown;
  found?: unknown;
}

/** Category for grouping failures (Phase 3A). */
export type FailureCategory = "auth-posture" | "shell" | "design-system" | "auth-routes";

/** Drift label for failure timeline (Phase 3B). */
export type DriftLabel = "newly-failing" | "regressed" | "persistently-failing";

/** Display label for drift (includes fallback when history insufficient). */
export type DriftLabelDisplay = DriftLabel | "failing";

/** Whether validation-outcomes.json exists and has sufficient history for narrative labels. */
export function validationOutcomesFileExists(): boolean {
  return existsSync(VALIDATION_OUTCOMES_PATH);
}

export function contractRunsFileExists(): boolean {
  return existsSync(CONTRACT_RUNS_PATH);
}

let runDocumentOverride:
  | { runs: ContractRunsDocument; lineage: ContractLineageDocument }
  | null = null;

function compareRunsAscending(a: ContractRun, b: ContractRun): number {
  const timeDiff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (timeDiff !== 0) return timeDiff;
  return String(a.runId).localeCompare(String(b.runId));
}

function sortRunsAscending(runs: ContractRun[]): ContractRun[] {
  return [...runs].sort(compareRunsAscending);
}

function sortRunsForDisplay(runs: ContractRun[]): ContractRun[] {
  return sortRunsAscending(runs).reverse();
}

function normalizeContractRun(raw: unknown): ContractRun | null {
  if (!raw || typeof raw !== "object") return null;
  const run = raw as Record<string, unknown>;
  if (typeof run.runId !== "string" || run.runId.length === 0) return null;
  if (typeof run.createdAt !== "string" || Number.isNaN(Date.parse(run.createdAt))) return null;
  if (typeof run.surfaceId !== "string" || run.surfaceId.length === 0) return null;
  const source = run.source;
  if (source !== "bootstrap" && source !== "generation" && source !== "ci" && source !== "runtime") {
    return null;
  }
  const status = run.status;
  if (status !== "pass" && status !== "warn" && status !== "fail" && status !== "unknown") {
    return null;
  }
  const workspaceId = normalizeWorkspaceId(
    typeof run.workspaceId === "string" ? run.workspaceId : getDefaultWorkspaceId()
  );

  const contract =
    run.contract && typeof run.contract === "object"
      ? (run.contract as Record<string, unknown>)
      : {};
  const artifacts =
    run.artifacts && typeof run.artifacts === "object"
      ? (run.artifacts as Record<string, unknown>)
      : {};
  const summary =
    run.summary && typeof run.summary === "object"
      ? (run.summary as Record<string, unknown>)
      : {};

  return {
    runId: run.runId,
    workspaceId,
    idempotencyKey:
      typeof run.idempotencyKey === "string" && run.idempotencyKey.length > 0
        ? run.idempotencyKey
        : undefined,
    ingestedAt:
      typeof run.ingestedAt === "string" && !Number.isNaN(Date.parse(run.ingestedAt))
        ? run.ingestedAt
        : undefined,
    createdAt: run.createdAt,
    surfaceId: run.surfaceId,
    source,
    contract: {
      id: typeof contract.id === "string" && contract.id.length > 0 ? contract.id : "unknown",
      version:
        typeof contract.version === "string" && contract.version.length > 0
          ? contract.version
          : "unknown",
      sha256:
        typeof contract.sha256 === "string" && contract.sha256.length > 0
          ? contract.sha256
          : "unknown",
    },
    artifacts: {
      extractionPath:
        typeof artifacts.extractionPath === "string" ? artifacts.extractionPath : undefined,
      reportPath: typeof artifacts.reportPath === "string" ? artifacts.reportPath : undefined,
    },
    status,
    findingCodes: Array.isArray(run.findingCodes)
      ? run.findingCodes.filter((entry): entry is string => typeof entry === "string")
      : [],
    summary: {
      errorCount:
        typeof summary.errorCount === "number" && summary.errorCount >= 0
          ? summary.errorCount
          : 0,
      warnCount:
        typeof summary.warnCount === "number" && summary.warnCount >= 0
          ? summary.warnCount
          : 0,
    },
  };
}

function loadContractRunsFromJson(): ContractRunsDocument {
  if (!existsSync(CONTRACT_RUNS_PATH)) {
    return { schemaVersion: 2, runs: [] };
  }
  try {
    const raw = readFileSync(CONTRACT_RUNS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ContractRunsDocument;
    const runs = Array.isArray(parsed.runs)
      ? parsed.runs
          .map((run) => normalizeContractRun(run))
          .filter((run): run is ContractRun => Boolean(run))
      : [];
    return {
      schemaVersion: Number(parsed.schemaVersion || 2),
      runs: sortRunsForDisplay(runs),
    };
  } catch {
    return { schemaVersion: 2, runs: [] };
  }
}

function loadContractLineageFromJson(): ContractLineageDocument {
  if (!existsSync(CONTRACT_LINEAGE_PATH)) {
    return { schemaVersion: 1, surfaces: {} };
  }
  try {
    const raw = readFileSync(CONTRACT_LINEAGE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ContractLineageDocument;
    return {
      schemaVersion: Number(parsed.schemaVersion || 1),
      surfaces:
        parsed.surfaces && typeof parsed.surfaces === "object"
          ? parsed.surfaces
          : {},
    };
  } catch {
    return { schemaVersion: 1, surfaces: {} };
  }
}

export function loadContractRuns(): ContractRunsDocument {
  if (runDocumentOverride) {
    return {
      schemaVersion: runDocumentOverride.runs.schemaVersion,
      runs: sortRunsForDisplay(runDocumentOverride.runs.runs),
    };
  }
  return loadContractRunsFromJson();
}

export function loadContractLineage(): ContractLineageDocument {
  if (runDocumentOverride) {
    return runDocumentOverride.lineage;
  }
  return loadContractLineageFromJson();
}

function withRunDocumentOverride<T>(
  docs: { runs: ContractRunsDocument; lineage: ContractLineageDocument },
  fn: () => T | Promise<T>
): T | Promise<T> {
  const previous = runDocumentOverride;
  runDocumentOverride = docs;
  let result: T | Promise<T>;
  try {
    result = fn();
  } catch (error) {
    runDocumentOverride = previous;
    throw error;
  }

  if (result && typeof (result as Promise<unknown>).then === "function") {
    return (result as Promise<T>).finally(() => {
      runDocumentOverride = previous;
    });
  }

  runDocumentOverride = previous;
  return result;
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function writeJsonAtomic(filePath: string, payload: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  writeFileSync(tempPath, `${stableJson(payload)}\n`, "utf-8");
  renameSync(tempPath, filePath);
}

function sleepMs(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function acquireRunStoreLock(lockPath: string, timeoutMs: number = RUN_STORE_LOCK_TIMEOUT_MS): void {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      mkdirSync(lockPath);
      return;
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      if (code !== "EEXIST") {
        throw error;
      }
      sleepMs(RUN_STORE_LOCK_POLL_MS);
    }
  }
  throw new Error(`Timed out acquiring run-store lock: ${lockPath}`);
}

function releaseRunStoreLock(lockPath: string): void {
  try {
    rmdirSync(lockPath);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code !== "ENOENT") {
      throw error;
    }
  }
}

function withRunStoreLock<T>(fn: () => T): T {
  acquireRunStoreLock(RUN_STORE_LOCK_PATH);
  try {
    return fn();
  } finally {
    releaseRunStoreLock(RUN_STORE_LOCK_PATH);
  }
}

function latestRunsBySurface(runs: ContractRun[]): Map<string, ContractRun> {
  const map = new Map<string, ContractRun>();
  for (const run of sortRunsAscending(runs)) {
    map.set(run.surfaceId, run);
  }
  return map;
}

function rebuildLineageFromRuns(runs: ContractRun[]): ContractLineageDocument {
  const surfaces: Record<string, ContractLineageRecord> = {};
  for (const [surfaceId, latestRun] of latestRunsBySurface(runs).entries()) {
    surfaces[surfaceId] = {
      lastRunId: latestRun.runId,
      lastRunAt: latestRun.createdAt,
      lastSource: latestRun.source,
      lastStatus: latestRun.status,
      contract: latestRun.contract,
      artifacts: latestRun.artifacts,
      findingCodes: latestRun.findingCodes,
    };
  }
  return { schemaVersion: 1, surfaces };
}

function dedupeRuns(runs: ContractRun[]): ContractRun[] {
  const byRunId = new Set<string>();
  const byIdempotencyKey = new Set<string>();
  const deduped: ContractRun[] = [];
  for (const run of sortRunsAscending(runs)) {
    const runKey = `${normalizeWorkspaceId(run.workspaceId)}:${run.runId}`;
    const idempotencyKey = run.idempotencyKey
      ? `${normalizeWorkspaceId(run.workspaceId)}:${run.idempotencyKey}`
      : null;
    if (byRunId.has(runKey)) continue;
    if (idempotencyKey && byIdempotencyKey.has(idempotencyKey)) continue;
    byRunId.add(runKey);
    if (idempotencyKey) byIdempotencyKey.add(idempotencyKey);
    deduped.push(run);
  }
  return deduped;
}

function persistRunDocuments(runs: ContractRun[]): void {
  const normalizedRuns = dedupeRuns(runs);
  const orderedRuns = sortRunsAscending(normalizedRuns);
  writeJsonAtomic(CONTRACT_RUNS_PATH, { schemaVersion: 2, runs: orderedRuns });
  writeJsonAtomic(CONTRACT_LINEAGE_PATH, rebuildLineageFromRuns(orderedRuns));
}

function normalizeRunStatus(status: unknown): ValidationOutcome {
  return status === "pass" || status === "warn" || status === "fail" || status === "unknown"
    ? status
    : "unknown";
}

export function getRecentRunOutcomes(surfaceId: string, limit: number = 5): ValidationOutcome[] {
  const runsDoc = loadContractRuns();
  const outcomes = runsDoc.runs
    .filter((run) => run.surfaceId === surfaceId)
    .map((run) => normalizeRunStatus(run.status))
    .slice(0, limit);
  return outcomes;
}

function summarizeStatus(status: ValidationOutcome, findingCodes: string[]): { errorCount: number; warnCount: number } {
  return {
    errorCount: status === "fail" ? Math.max(1, findingCodes.length) : 0,
    warnCount: status === "warn" ? Math.max(1, findingCodes.length) : 0,
  };
}


function runCodesToFindings(surfaceId: string, codes: string[]): Phase0Finding[] {
  return codes.map((code) => ({
    surfaceId,
    code,
    category: code.startsWith("phase0.") ? "E2" : "E0",
    message: `Run finding code: ${code}`,
  }));
}

/** Point of intervention for a finding (Phase 5). */
export type InterventionPoint = "Application code" | "Contract definition" | "Both";

/** Action guidance for a finding code (Phase 5). Deterministic, non-prescriptive. */
export function getActionGuidance(code: string): string {
  const map: Record<string, string> = {
    "phase0.designSystem.missing":
      "Restore @surfaces/ui usage or update contract expectations.",
    "phase0.authRoutes.missing": "Add auth routes or relax expectsAuthRoutes.",
    "phase0.authPosture.mismatch":
      "Add auth integration or relax authPosture in contract.",
    "phase0.shell.mismatch": "Add layout shell or relax requiresShell in contract.",
    "phase0.load.contract": "Resolve contract load or parse error.",
    "phase0.load.extracted": "Resolve extraction load or parse error.",
  };
  return map[code] ?? "Review the finding and adjust application code or contract definition.";
}

/** Where the fix happens for a finding (Phase 5). */
export function getInterventionPoint(code: string): InterventionPoint {
  if (code.startsWith("phase0.load.")) return "Contract definition";
  if (
    code === "phase0.designSystem.missing" ||
    code === "phase0.authRoutes.missing" ||
    code === "phase0.authPosture.mismatch" ||
    code === "phase0.shell.mismatch"
  ) {
    return "Both";
  }
  return "Both";
}

/** Human-readable intervention label for display (Phase 5). */
export function getInterventionLabel(point: InterventionPoint): string {
  return point === "Both"
    ? "Application code, Contract definition"
    : point;
}

/** Operational responsibility label (Phase 5). Uses owner; neutral fallback when empty. */
export function getOperationalResponsibility(owner: string | undefined): string {
  const trimmed = owner?.trim();
  return trimmed ? trimmed : "Owner not specified";
}

/**
 * Pass rate over recent runs (PR 3). Uses validation-outcomes.json when present.
 * Returns null when no history data available.
 */
export function getPassRate(
  surfaceId: string,
  limit: number = 10
): { passed: number; total: number } | null {
  const contract = loadPolicyContract();
  const outcomes = loadValidationOutcomes(contract);
  const surfaceOutcomes = outcomes[surfaceId];
  if (!surfaceOutcomes || surfaceOutcomes.length === 0) return null;
  const recent = surfaceOutcomes.slice(0, limit);
  const passed = recent.filter((o) => o === "pass").length;
  return { passed, total: recent.length };
}

/**
 * Whether this surface has ever passed in outcome history (PR 3).
 * Uses validation-outcomes.json when present. Returns null when no history.
 */
export function hasEverPassed(surfaceId: string): boolean | null {
  const contract = loadPolicyContract();
  const outcomes = loadValidationOutcomes(contract);
  const surfaceOutcomes = outcomes[surfaceId];
  if (!surfaceOutcomes || surfaceOutcomes.length === 0) return null;
  return surfaceOutcomes.some((o) => o === "pass");
}

export interface SourcePassRate {
  source: RunSource;
  passed: number;
  total: number;
  insufficientHistory: boolean;
}

export interface SourceRecurringFinding {
  source: RunSource;
  codes: { code: string; count: number }[];
  insufficientHistory: boolean;
}

export interface SourceTimeToGreen {
  source: RunSource;
  latestMs: number | null;
  averageMs: number | null;
  samples: number;
  insufficientHistory: boolean;
}

function runsForSurfaceBySource(surfaceId: string, source: RunSource): ContractRun[] {
  const runsDoc = loadContractRuns();
  return sortRunsAscending(
    runsDoc.runs.filter((run) => run.surfaceId === surfaceId && run.source === source)
  );
}

function sourcePassRate(surfaceId: string, source: RunSource): SourcePassRate {
  const runs = runsForSurfaceBySource(surfaceId, source);
  const total = runs.length;
  const passed = runs.filter((run) => run.status === "pass").length;
  return {
    source,
    passed,
    total,
    insufficientHistory: total < 2,
  };
}

function sourceRecurringFindings(
  surfaceId: string,
  source: RunSource,
  topN: number = 3
): SourceRecurringFinding {
  const runs = runsForSurfaceBySource(surfaceId, source);
  if (runs.length < 2) {
    return { source, codes: [], insufficientHistory: true };
  }
  const counts: Record<string, number> = {};
  for (const run of runs) {
    for (const code of run.findingCodes) {
      counts[code] = (counts[code] ?? 0) + 1;
    }
  }
  const codes = Object.entries(counts)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
    .slice(0, topN);
  return {
    source,
    codes,
    insufficientHistory: codes.length === 0,
  };
}

function sourceTimeToGreen(surfaceId: string, source: RunSource): SourceTimeToGreen {
  const runs = runsForSurfaceBySource(surfaceId, source);
  if (runs.length < 2) {
    return {
      source,
      latestMs: null,
      averageMs: null,
      samples: 0,
      insufficientHistory: true,
    };
  }

  const samples: number[] = [];
  let openFailureAt: number | null = null;
  for (const run of runs) {
    const runAt = Date.parse(run.createdAt);
    if (Number.isNaN(runAt)) continue;

    if (run.status === "fail" || run.status === "warn") {
      if (openFailureAt === null) {
        openFailureAt = runAt;
      }
      continue;
    }

    if (run.status === "pass" && openFailureAt !== null) {
      const delta = runAt - openFailureAt;
      if (delta >= 0) {
        samples.push(delta);
      }
      openFailureAt = null;
    }
  }

  if (samples.length === 0) {
    return {
      source,
      latestMs: null,
      averageMs: null,
      samples: 0,
      insufficientHistory: true,
    };
  }

  const sum = samples.reduce((total, value) => total + value, 0);
  return {
    source,
    latestMs: samples[samples.length - 1],
    averageMs: Math.round(sum / samples.length),
    samples: samples.length,
    insufficientHistory: false,
  };
}

export function getPerSourcePassRates(surfaceId: string): SourcePassRate[] {
  return (["bootstrap", "generation", "ci", "runtime"] as RunSource[]).map((source) =>
    sourcePassRate(surfaceId, source)
  );
}

export function getPerSourceRecurringFindings(
  surfaceId: string,
  topN: number = 3
): SourceRecurringFinding[] {
  return (["bootstrap", "generation", "ci", "runtime"] as RunSource[]).map((source) =>
    sourceRecurringFindings(surfaceId, source, topN)
  );
}

export function getPerSourceTimeToGreen(surfaceId: string): SourceTimeToGreen[] {
  return (["bootstrap", "generation", "ci", "runtime"] as RunSource[]).map((source) =>
    sourceTimeToGreen(surfaceId, source)
  );
}

/**
 * Count surfaces in the contract that use this expectation (PR 4).
 * "Use" means the expectation is enabled (would trigger validation).
 */
export function countSurfacesUsingExpectation(
  contract: PolicyContract,
  expectationKey: string
): number {
  let count = 0;
  for (const s of contract.surfaces) {
    const phase0 = s.phase0;
    if (!phase0) continue;
    const val = (phase0 as Record<string, unknown>)[expectationKey];
    if (expectationKey === "authPosture") {
      if (val === "auth-aware" || val === "auth-first") count++;
    } else if (val === true) {
      count++;
    }
  }
  return count;
}

/**
 * Load last N validation outcomes per surface from committed state.
 * Falls back to current state only when file is unavailable.
 */
export function loadValidationOutcomes(
  contract: PolicyContract
): Record<string, ValidationOutcome[]> {
  const runsDoc = loadContractRuns();
  if (runsDoc.runs.length > 0) {
    const bySurface: Record<string, ValidationOutcome[]> = {};
    for (const surface of contract.surfaces) {
      const outcomes = runsDoc.runs
        .filter((run) => run.surfaceId === surface.id)
        .map((run) => normalizeRunStatus(run.status))
        .slice(0, MAX_OUTCOMES);
      if (outcomes.length > 0) {
        bySurface[surface.id] = outcomes;
      }
    }
    if (Object.keys(bySurface).length > 0) {
      return bySurface;
    }
  }

  const committed: Record<string, ValidationOutcome[]> = {};
  if (existsSync(VALIDATION_OUTCOMES_PATH)) {
    try {
      const raw = readFileSync(VALIDATION_OUTCOMES_PATH, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, string[]>;
      for (const [id, outcomes] of Object.entries(parsed)) {
        const valid = outcomes
          .filter((o): o is ValidationOutcome =>
            o === "pass" || o === "warn" || o === "fail" || o === "unknown"
          )
          .slice(0, MAX_OUTCOMES);
        if (valid.length) committed[id] = valid;
      }
    } catch {
      // Ignore parse errors
    }
  }

  const result: Record<string, ValidationOutcome[]> = {};
  for (const surface of contract.surfaces) {
    const current = computeValidationStatus(surface, loadExtraction(surface.id));
    const fromFile = committed[surface.id];
    if (fromFile && fromFile.length > 0) {
      result[surface.id] = fromFile;
    } else {
      result[surface.id] = [current];
    }
  }
  return result;
}

/** Change summary since last extraction (Phase 6A hardening). */
export interface ExtractionChangeSummary {
  routesAdded: number;
  routesRemoved: number;
  designSystemComponentsAdded: number;
  designSystemComponentsRemoved: number;
  hasShellChanged: boolean | null;
  authAwareChanged: boolean | null;
  previousExtractionAvailable: boolean;
}

/** Run snapshot for a surface (Phase 6A / PR 2). Standardized shape, no undefined fields. */
export interface RunSnapshot {
  surfaceId: string;
  domain: string;
  status: ValidationOutcome;
  latestSource: RunSource | "none";
  latestRunAt: string;
  latestRunId: string;
  contractVersion: string;
  findings: Phase0Finding[];
  findingCodes: string[];
  contractCommit: GitLogEntry | null;
  extractionCommit: GitLogEntry | null;
  contractTimestamp: string;
  extractionTimestamp: string;
  buildMetadata: ReturnType<typeof getBuildMetadata>;
  changeSinceLastExtraction: ExtractionChangeSummary | null;
  previousRunFindings: Phase0Finding[] | null;
}

/** Result of comparing current run to previous run (PR 2). */
export type RunComparisonNarrative =
  | { narrative: "Same failure as last run" }
  | { narrative: "New failure since last run" };

/** Surface run series (Phase 6A). */
export interface SurfaceRunSeries {
  surfaceId: string;
  snapshots: RunSnapshot[];
  history?: {
    outcomes: ValidationOutcome[];
  };
}

export interface FindingCodeDelta {
  newCodes: string[];
  resolvedCodes: string[];
}

export interface SurfaceEvolution {
  surfaceId: string;
  runs: ContractRun[];
  latestBySource: Partial<Record<RunSource, ContractRun>>;
  findingDelta: FindingCodeDelta | null;
}

export type RunStoreMode = "auto" | "json" | "db";

export interface RunStore {
  readonly mode: "json" | "db";
  loadRuns(): Promise<ContractRunsDocument>;
  loadLineage(runsDoc?: ContractRunsDocument): Promise<ContractLineageDocument>;
}

export class JsonRunStore implements RunStore {
  readonly mode = "json" as const;

  async loadRuns(): Promise<ContractRunsDocument> {
    return loadContractRunsFromJson();
  }
  async loadLineage(): Promise<ContractLineageDocument> {
    return loadContractLineageFromJson();
  }
}

export class DbRunStore implements RunStore {
  readonly mode = "db" as const;
  private readonly workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = normalizeWorkspaceId(workspaceId);
  }

  private mapDbRunRow(row: Record<string, unknown>): ContractRun {
    return {
      runId: String(row.run_id),
      workspaceId: normalizeWorkspaceId(
        typeof row.workspace_id === "string" ? row.workspace_id : this.workspaceId
      ),
      idempotencyKey:
        row.idempotency_key && typeof row.idempotency_key === "string"
          ? row.idempotency_key
          : undefined,
      ingestedAt:
        row.ingested_at && typeof row.ingested_at === "string"
          ? row.ingested_at
          : undefined,
      createdAt: String(row.created_at),
      surfaceId: String(row.surface_id),
      source: String(row.source) as RunSource,
      contract: {
        id: String(row.contract_id),
        version: String(row.contract_version),
        sha256: String(row.contract_sha256),
      },
      artifacts: {
        extractionPath:
          row.artifacts_extraction_path && typeof row.artifacts_extraction_path === "string"
            ? row.artifacts_extraction_path
            : undefined,
        reportPath:
          row.artifacts_report_path && typeof row.artifacts_report_path === "string"
            ? row.artifacts_report_path
            : undefined,
      },
      status: String(row.status) as ValidationOutcome,
      findingCodes: Array.isArray(row.finding_codes)
        ? row.finding_codes.filter((entry): entry is string => typeof entry === "string")
        : [],
      summary: {
        errorCount: typeof row.error_count === "number" ? row.error_count : 0,
        warnCount: typeof row.warn_count === "number" ? row.warn_count : 0,
      },
    };
  }

  async loadRuns(): Promise<ContractRunsDocument> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
         workspace_id,
         run_id,
         idempotency_key,
         ingested_at,
         created_at,
         surface_id,
         source,
         contract_id,
         contract_version,
         contract_sha256,
         artifacts_extraction_path,
         artifacts_report_path,
         status,
         finding_codes,
         error_count,
         warn_count
       FROM contract_runs
       WHERE workspace_id = $1
       ORDER BY created_at ASC, run_id ASC`,
      [this.workspaceId]
    );
    const runs = result.rows
      .map((row) => this.mapDbRunRow(row as Record<string, unknown>))
      .filter((run) => normalizeContractRun(run) !== null);
    return {
      schemaVersion: 1,
      runs: sortRunsAscending(runs),
    };
  }

  async loadLineage(runsDoc?: ContractRunsDocument): Promise<ContractLineageDocument> {
    const runs = runsDoc ? runsDoc.runs : (await this.loadRuns()).runs;
    return rebuildLineageFromRuns(runs);
  }
}

function parseRunStoreMode(raw: string | undefined): RunStoreMode {
  if (raw === "json" || raw === "db" || raw === "auto") return raw;
  return "auto";
}

function getConfiguredRunStoreMode(): RunStoreMode {
  return parseRunStoreMode(process.env.SURFACEOPS_RUNSTORE_MODE);
}

async function tryLoadFromDbStoreByWorkspace(workspaceId: string): Promise<{
  runs: ContractRunsDocument;
  lineage: ContractLineageDocument;
}> {
  const store = new DbRunStore(workspaceId);
  const runs = await store.loadRuns();
  const lineage = await store.loadLineage(runs);
  return { runs, lineage };
}

function loadFromJsonStore(workspaceId: string): {
  runs: ContractRunsDocument;
  lineage: ContractLineageDocument;
} {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const runs = loadContractRunsFromJson().runs.filter(
    (run) => normalizeWorkspaceId(run.workspaceId) === normalizedWorkspaceId
  );
  const orderedRuns = sortRunsAscending(runs);
  return {
    runs: {
      schemaVersion: 2,
      runs: orderedRuns,
    },
    lineage: rebuildLineageFromRuns(orderedRuns),
  };
}

export async function loadRunDocumentsFromStore(options?: { workspaceId?: string }): Promise<{
  runs: ContractRunsDocument;
  lineage: ContractLineageDocument;
  mode: "json" | "db";
  fallbackUsed: boolean;
  warning?: string;
}> {
  const workspaceId = normalizeWorkspaceId(options?.workspaceId ?? getDefaultWorkspaceId());
  const mode = getConfiguredRunStoreMode();
  const hasDbConfig = Boolean(process.env.DATABASE_URL);

  if (mode === "json") {
    const jsonDocs = loadFromJsonStore(workspaceId);
    return { ...jsonDocs, mode: "json", fallbackUsed: false };
  }

  if (mode === "auto" && !hasDbConfig) {
    const jsonDocs = loadFromJsonStore(workspaceId);
    return { ...jsonDocs, mode: "json", fallbackUsed: false };
  }

  if (mode === "db" && !hasDbConfig) {
    const jsonDocs = loadFromJsonStore(workspaceId);
    return {
      ...jsonDocs,
      mode: "json",
      fallbackUsed: true,
      warning: "DB mode requested but DATABASE_URL is not configured",
    };
  }

  try {
    const dbDocs = await tryLoadFromDbStoreByWorkspace(workspaceId);
    return { ...dbDocs, mode: "db", fallbackUsed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown DB RunStore failure";
    const jsonDocs = loadFromJsonStore(workspaceId);
    if (mode === "db") {
      return {
        ...jsonDocs,
        mode: "json",
        fallbackUsed: true,
        warning: `DB mode requested but unavailable: ${message}`,
      };
    }
    return {
      ...jsonDocs,
      mode: "json",
      fallbackUsed: true,
      warning: `Auto mode fell back to JSON RunStore: ${message}`,
    };
  }
}

export async function withStoreBackedRunDocuments<T>(
  workspaceIdOrFn:
    | string
    | ((metadata: { mode: "json" | "db"; fallbackUsed: boolean; warning?: string }) => T | Promise<T>),
  fnMaybe?: (metadata: { mode: "json" | "db"; fallbackUsed: boolean; warning?: string }) => T | Promise<T>
): Promise<T> {
  const workspaceId =
    typeof workspaceIdOrFn === "string"
      ? normalizeWorkspaceId(workspaceIdOrFn)
      : getDefaultWorkspaceId();
  const fn =
    typeof workspaceIdOrFn === "function"
      ? workspaceIdOrFn
      : fnMaybe;
  if (!fn) {
    throw new Error("withStoreBackedRunDocuments requires a callback function.");
  }

  const docs = await loadRunDocumentsFromStore({ workspaceId });
  return withRunDocumentOverride({ runs: docs.runs, lineage: docs.lineage }, () =>
    fn({
      mode: docs.mode,
      fallbackUsed: docs.fallbackUsed,
      warning: docs.warning,
    })
  );
}

/**
 * Get previous extraction from git parent commit (Phase 6A hardening).
 * Returns null if previous extraction is not available.
 */
function getPreviousExtraction(surfaceId: string): ExtractedSurface | null {
  try {
    const path = `contracts/generated/${surfaceId}.extraction.json`;
    const output = execSync(`git show HEAD~1:${path}`, {
      cwd: WORKSPACE_ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    if (!output) return null;
    return JSON.parse(output) as ExtractedSurface;
  } catch {
    return null;
  }
}

/**
 * Compute change summary since last extraction (Phase 6A hardening).
 */
function computeExtractionChangeSummary(
  current: ExtractedSurface | null,
  previous: ExtractedSurface | null
): ExtractionChangeSummary {
  if (!previous) {
    return {
      routesAdded: current?.extracted.routes?.length ?? 0,
      routesRemoved: 0,
      designSystemComponentsAdded: current?.extracted.designSystemComponents?.length ?? 0,
      designSystemComponentsRemoved: 0,
      hasShellChanged: null,
      authAwareChanged: null,
      previousExtractionAvailable: false,
    };
  }

  const currentRoutes = new Set(current?.extracted.routes ?? []);
  const previousRoutes = new Set(previous.extracted.routes ?? []);
  const routesAdded = [...currentRoutes].filter((r) => !previousRoutes.has(r)).length;
  const routesRemoved = [...previousRoutes].filter((r) => !currentRoutes.has(r)).length;

  const currentComponents = new Set(current?.extracted.designSystemComponents ?? []);
  const previousComponents = new Set(previous.extracted.designSystemComponents ?? []);
  const designSystemComponentsAdded = [...currentComponents].filter(
    (c) => !previousComponents.has(c)
  ).length;
  const designSystemComponentsRemoved = [...previousComponents].filter(
    (c) => !currentComponents.has(c)
  ).length;

  const hasShellChanged =
    current?.extracted.hasShell !== previous.extracted.hasShell
      ? current?.extracted.hasShell !== previous.extracted.hasShell
      : null;
  const authAwareChanged =
    current?.extracted.authAware !== previous.extracted.authAware
      ? current?.extracted.authAware !== previous.extracted.authAware
      : null;

  return {
    routesAdded,
    routesRemoved,
    designSystemComponentsAdded,
    designSystemComponentsRemoved,
    hasShellChanged,
    authAwareChanged,
    previousExtractionAvailable: true,
  };
}

/**
 * Get a single run snapshot for a surface (Phase 6A).
 * Computes status and findings from current contract + extracted.
 * Never throws; returns null on any error (PR 2).
 */
export function getRunSnapshot(surfaceId: string): RunSnapshot | null {
  try {
    const contract = loadPolicyContract();
    const surface = contract.surfaces.find((s) => s.id === surfaceId);
    const runsDoc = loadContractRuns();
    const latestRun = runsDoc.runs.find((run) => run.surfaceId === surfaceId) || null;
    const extracted = loadExtraction(surfaceId);
    const extractedStatus = surface ? computeValidationStatus(surface, extracted) : "unknown";
    const extractedFindings = surface ? computeFindings(surface, extracted) : [];
    const status = latestRun ? normalizeRunStatus(latestRun.status) : extractedStatus;
    const findingCodes =
      latestRun && Array.isArray(latestRun.findingCodes)
        ? latestRun.findingCodes
        : extractedFindings.map((f) => f.code);
    const findings =
      latestRun && findingCodes.length > 0
        ? runCodesToFindings(surfaceId, findingCodes)
        : extractedFindings;
    const contractCommit = getLastContractChange();
    const extractionCommit = getLastExtractionRun(surfaceId);
    const buildMetadata = getBuildMetadata();

    // Compute change since last extraction. Null when git history unavailable (PR 2).
    const previousExtraction = getPreviousExtraction(surfaceId);
    const changeSinceLastExtraction = previousExtraction
      ? computeExtractionChangeSummary(extracted, previousExtraction)
      : null;

    // Previous run findings (current contract + previous extraction) for run-to-run comparison
    const previousRunFindings = surface && previousExtraction
      ? computeFindings(surface, previousExtraction)
      : null;

    const fallbackDomain = (() => {
      const sourceUrl = extracted?.onboarding?.sourceUrl;
      if (!sourceUrl) return surfaceId;
      try {
        return new URL(sourceUrl).origin;
      } catch {
        return surfaceId;
      }
    })();

    return {
      surfaceId,
      domain: surface?.domain ?? fallbackDomain,
      status,
      latestSource: latestRun?.source ?? "none",
      latestRunAt: latestRun?.createdAt ?? "unknown",
      latestRunId: latestRun?.runId ?? "unknown",
      contractVersion: latestRun?.contract?.version ?? contract.version ?? "unknown",
      findings,
      findingCodes,
      contractCommit,
      extractionCommit,
      contractTimestamp: contractCommit?.relativeTime ?? "unknown",
      extractionTimestamp: extractionCommit?.relativeTime ?? "unknown",
      buildMetadata,
      changeSinceLastExtraction,
      previousRunFindings,
    };
  } catch {
    return null;
  }
}

/**
 * Compare current run to previous run by finding codes only (PR 2).
 * Returns narrative when comparison is possible; null when no prior run exists.
 */
export function compareRuns(
  currentFindings: Phase0Finding[],
  previousFindings: Phase0Finding[] | null | undefined
): RunComparisonNarrative | null {
  if (previousFindings === null || previousFindings === undefined) {
    return null;
  }
  const currentCodes = new Set(currentFindings.map((f) => f.code));
  const previousCodes = new Set(previousFindings.map((f) => f.code));
  const sameSet =
    currentCodes.size === previousCodes.size &&
    [...currentCodes].every((c) => previousCodes.has(c));
  return sameSet
    ? { narrative: "Same failure as last run" }
    : { narrative: "New failure since last run" };
}

/**
 * Get surface run series (Phase 6A).
 * Returns a single snapshot in Phase 6A, with optional history from validation-outcomes.json.
 * Future-proofed for multiple snapshots but does not parse git history in this phase.
 */
export function getSurfaceRunSeries(
  surfaceId: string,
  limit: number = 10
): SurfaceRunSeries | null {
  const snapshot = getRunSnapshot(surfaceId);
  if (!snapshot) return null;

  const contract = loadPolicyContract();
  const outcomes = loadValidationOutcomes(contract);
  const surfaceOutcomes = outcomes[surfaceId] ?? getRecentRunOutcomes(surfaceId, limit);

  return {
    surfaceId,
    snapshots: [snapshot],
    history: surfaceOutcomes.length > 0 ? { outcomes: surfaceOutcomes } : undefined,
  };
}

export function getLatestRunBySource(
  surfaceId: string,
  source: RunSource
): ContractRun | null {
  const runsDoc = loadContractRuns();
  return runsDoc.runs.find((run) => run.surfaceId === surfaceId && run.source === source) || null;
}

function computeFindingCodeDelta(runs: ContractRun[]): FindingCodeDelta | null {
  if (runs.length < 2) return null;
  const latest = new Set(runs[0].findingCodes || []);
  const previous = new Set(runs[1].findingCodes || []);
  return {
    newCodes: [...latest].filter((code) => !previous.has(code)).sort(),
    resolvedCodes: [...previous].filter((code) => !latest.has(code)).sort(),
  };
}

export function getSurfaceEvolution(surfaceId: string): SurfaceEvolution {
  const runsDoc = loadContractRuns();
  const runs = runsDoc.runs.filter((run) => run.surfaceId === surfaceId);
  const latestBySource: Partial<Record<RunSource, ContractRun>> = {};
  for (const source of ["bootstrap", "generation", "ci", "runtime"] as RunSource[]) {
    const latest = runs.find((run) => run.source === source);
    if (latest) latestBySource[source] = latest;
  }
  return {
    surfaceId,
    runs,
    latestBySource,
    findingDelta: computeFindingCodeDelta(runs),
  };
}

/**
 * Get contract expectation key that triggered a finding (Phase 6A hardening).
 * Derives from finding code mapping.
 */
export function getContractExpectationKey(code: string): string | null {
  const map: Record<string, string> = {
    "phase0.designSystem.missing": "expectsDesignSystem",
    "phase0.authRoutes.missing": "expectsAuthRoutes",
    "phase0.authPosture.mismatch": "authPosture",
    "phase0.shell.mismatch": "requiresShell",
  };
  return map[code] ?? null;
}

/**
 * Get current expectation value from contract surface phase0 block.
 * Reads directly from contract; does not infer.
 */
export function getContractExpectationValue(
  surface: PolicySurface,
  key: string
): unknown {
  const phase0 = surface.phase0;
  if (!phase0) return undefined;
  return (phase0 as Record<string, unknown>)[key];
}

/**
 * Plain-text relaxed alternative for a finding.
 * Describes what contract change would make this pass.
 */
export function getRelaxedAlternativeText(
  code: string,
  key: string,
  value: unknown
): string {
  if (value === true && (key === "expectsDesignSystem" || key === "expectsAuthRoutes" || key === "requiresShell")) {
    return "Would pass if false";
  }
  if (key === "authPosture" && (value === "auth-aware" || value === "auth-first")) {
    return "Would pass if relaxed to public";
  }
  return "Would pass if expectation removed or relaxed";
}

/**
 * One-line explanation of what an expectation asserts and which extraction signal it activates.
 */
export function getExpectationMeaning(key: string): string {
  const map: Record<string, string> = {
    expectsDesignSystem:
      "Asserts that the app uses design system components. Checks extraction signal: designSystemComponents.",
    expectsAuthRoutes:
      "Asserts that the app exposes auth routes (/auth/login, etc.). Checks extraction signal: routes.",
    authPosture:
      "Asserts auth integration level (auth-aware or auth-first). Checks extraction signal: authAware.",
    requiresShell:
      "Asserts that the app has a layout shell. Checks extraction signal: hasShell.",
  };
  return map[key] ?? "Checks extraction signals against contract expectations.";
}

/**
 * Summarize recurring findings for a surface (Phase 6A).
 * Uses validation-outcomes.json when present, otherwise uses current findings only.
 */
export function summarizeRecurringFindings(
  surfaceId: string
): { code: string; count: number }[] {
  // If we have validation-outcomes.json with history, we could analyze recurring patterns
  // For Phase 6A, we'll use current findings only since we don't have historical findings stored
  const snapshot = getRunSnapshot(surfaceId);
  if (!snapshot) return [];

  const codeCounts: Record<string, number> = {};
  for (const finding of snapshot.findings) {
    codeCounts[finding.code] = (codeCounts[finding.code] || 0) + 1;
  }

  return Object.entries(codeCounts)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
}
