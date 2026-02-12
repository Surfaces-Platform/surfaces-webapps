import type { SurfaceContract, ValidationFinding } from "./types";

const SURFACES = new Set(["marketing", "app", "admin", "cli"]);
const RULE_LEVELS = new Set(["required", "allowed", "forbidden"]);
const CONTRACT_STYLES = new Set(["onCommit", "onBuild"]);
const SEVERITIES = new Set(["informational", "warning", "blocking"]);
const FIX_POLICIES = new Set(["never", "safeOnly"]);

export function validateContract(contract: SurfaceContract): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  if (!SURFACES.has(contract.surface)) {
    findings.push({
      level: "danger",
      message: "surface must be one of marketing, app, admin, cli",
      path: "/surface",
    });
  }

  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(contract.version)) {
    findings.push({
      level: "danger",
      message: "version must match semantic version format x.y.z",
      path: "/version",
    });
  }

  const patterns = contract.layout.allowedPatterns;
  for (const [key, value] of Object.entries(patterns)) {
    if (!RULE_LEVELS.has(value)) {
      findings.push({
        level: "danger",
        message: "layout pattern rule must be required, allowed, or forbidden",
        path: `/layout/allowedPatterns/${key}`,
      });
    }
  }

  if (contract.layout.maxContentWidth < 320 || contract.layout.maxContentWidth > 2400) {
    findings.push({
      level: "danger",
      message: "maxContentWidth must be between 320 and 2400",
      path: "/layout/maxContentWidth",
    });
  }

  for (const [key, value] of Object.entries(contract.navigation.types)) {
    if (!RULE_LEVELS.has(value)) {
      findings.push({
        level: "danger",
        message: "navigation type rule must be required, allowed, or forbidden",
        path: `/navigation/types/${key}`,
      });
    }
  }

  if (contract.navigation.maxDepth < 1 || contract.navigation.maxDepth > 6) {
    findings.push({
      level: "danger",
      message: "maxDepth must be between 1 and 6",
      path: "/navigation/maxDepth",
    });
  }

  if (!CONTRACT_STYLES.has(contract.drift.detectionMode)) {
    findings.push({
      level: "danger",
      message: "detectionMode must be onCommit or onBuild",
      path: "/drift/detectionMode",
    });
  }

  if (!SEVERITIES.has(contract.drift.severityThreshold)) {
    findings.push({
      level: "danger",
      message: "severityThreshold must be informational, warning, or blocking",
      path: "/drift/severityThreshold",
    });
  }

  if (!FIX_POLICIES.has(contract.drift.autoFixPolicy)) {
    findings.push({
      level: "danger",
      message: "autoFixPolicy must be never or safeOnly",
      path: "/drift/autoFixPolicy",
    });
  }

  if (findings.length === 0) {
    return [{ level: "ok", message: "Contract is valid." }];
  }
  return findings;
}
