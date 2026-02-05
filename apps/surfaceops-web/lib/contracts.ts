import { readFileSync } from "fs";
import { join } from "path";

const CONTRACTS_DIR = join(process.cwd(), "..", "..", "contracts");

export interface PolicySurface {
  id: string;
  displayName: string;
  type: string;
  domain?: string;
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
