import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const CONTRACTS_DIR = join(process.cwd(), "..", "..", "contracts");
const WORKSPACE_ROOT = join(CONTRACTS_DIR, "..");

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
 * interfacectl sha: unknown (TODO: inject at build time from tools/interfacectl submodule if needed).
 */
export function getBuildMetadata(): {
  surfaceopsBuildSha: string;
  interfacectlSha: string;
} {
  const surfaceopsBuildSha =
    (typeof process !== "undefined" && process.env?.VERCEL_GIT_COMMIT_SHA) || "unknown";
  // TODO: Expose interfacectl submodule SHA at build time if needed; avoid git at runtime on Vercel.
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
}

export function loadPolicyContract(): PolicyContract {
  const path = join(CONTRACTS_DIR, "surfaces.web.contract.json");
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as PolicyContract;
}

export function loadExtraction(surfaceId: string): ExtractedSurface | null {
  try {
    const path = join(CONTRACTS_DIR, "generated", `${surfaceId}.extraction.json`);
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as ExtractedSurface;
  } catch {
    return null;
  }
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

  return findings.sort((a, b) => a.code.localeCompare(b.code));
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

const VALIDATION_OUTCOMES_PATH = join(CONTRACTS_DIR, "generated", "validation-outcomes.json");
const MAX_OUTCOMES = 5;
const AUTH_ROUTES = ["/auth/login", "/auth/callback", "/auth/session", "/auth/logout"];

export type ValidationOutcome = "pass" | "fail" | "unknown";

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

/**
 * Load last N validation outcomes per surface from committed state.
 * Falls back to current state only when file is unavailable.
 */
export function loadValidationOutcomes(
  contract: PolicyContract
): Record<string, ValidationOutcome[]> {
  let committed: Record<string, ValidationOutcome[]> = {};
  if (existsSync(VALIDATION_OUTCOMES_PATH)) {
    try {
      const raw = readFileSync(VALIDATION_OUTCOMES_PATH, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, string[]>;
      for (const [id, outcomes] of Object.entries(parsed)) {
        const valid = outcomes
          .filter((o): o is ValidationOutcome =>
            o === "pass" || o === "fail" || o === "unknown"
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
