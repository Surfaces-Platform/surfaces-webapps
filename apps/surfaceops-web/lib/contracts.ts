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

const VALIDATION_OUTCOMES_PATH = join(CONTRACTS_DIR, "generated", "validation-outcomes.json");
const MAX_OUTCOMES = 5;

export type ValidationOutcome = "pass" | "fail" | "unknown";

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
