import type { SurfaceContract, SimulationFinding } from "./types";

export function simulateFindings(contract: SurfaceContract): SimulationFinding[] {
  const findings: SimulationFinding[] = [];

  const generated = {
    navSystems: ["topNav", "sideNav", "localSubNav"],
    navDepth: 3,
    hasGlobalHeader: false,
  };

  if (
    contract.navigation.disallowDuplicateNavigation &&
    generated.navSystems.length > 2
  ) {
    findings.push({
      id: "nav.duplicate",
      level: "block",
      message: "Duplicate navigation detected.",
      rulePath: "/navigation/disallowDuplicateNavigation",
    });
  }

  if (generated.navDepth > contract.navigation.maxDepth) {
    findings.push({
      id: "nav.depth",
      level: contract.drift.severityThreshold === "blocking" ? "block" : "warn",
      message: `Exceeded navigation depth (${generated.navDepth} > ${contract.navigation.maxDepth}).`,
      rulePath: "/navigation/maxDepth",
    });
  }

  if (contract.layout.requireGlobalHeader && !generated.hasGlobalHeader) {
    findings.push({
      id: "layout.header",
      level: "block",
      message: "Missing global header.",
      rulePath: "/layout/requireGlobalHeader",
    });
  }

  if (contract.layout.allowedPatterns.dashboardGrid === "forbidden") {
    findings.push({
      id: "layout.patterns",
      level: "info",
      message: "Dashboard grid is forbidden for this contract.",
      rulePath: "/layout/allowedPatterns/dashboardGrid",
    });
  }

  return findings;
}
