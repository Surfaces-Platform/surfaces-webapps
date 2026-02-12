export interface ExtractionShape {
  extracted?: {
    routes?: string[];
    designSystemComponents?: string[];
    authAware?: boolean;
    hasShell?: boolean;
  };
}

export interface ExtractionDiffItem {
  id: string;
  kind: "routes" | "designSystemComponents" | "authAware" | "hasShell";
  label: string;
  details: string;
  evolve: {
    tab: "layout" | "navigation" | "generation" | "drift";
    path: string;
  };
}

function toSet(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter((entry): entry is string => typeof entry === "string"));
}

export function buildExtractionDiff(
  current: ExtractionShape,
  latest: ExtractionShape,
): ExtractionDiffItem[] {
  const currentRoutes = toSet(current.extracted?.routes);
  const latestRoutes = toSet(latest.extracted?.routes);
  const currentDesign = toSet(current.extracted?.designSystemComponents);
  const latestDesign = toSet(latest.extracted?.designSystemComponents);

  const routesAdded = [...latestRoutes].filter((route) => !currentRoutes.has(route));
  const routesRemoved = [...currentRoutes].filter((route) => !latestRoutes.has(route));
  const designAdded = [...latestDesign].filter((name) => !currentDesign.has(name));
  const designRemoved = [...currentDesign].filter((name) => !latestDesign.has(name));

  const items: ExtractionDiffItem[] = [];

  if (routesAdded.length > 0 || routesRemoved.length > 0) {
    items.push({
      id: "routes-diff",
      kind: "routes",
      label: "Route map changed",
      details: `+${routesAdded.length} / -${routesRemoved.length}`,
      evolve: { tab: "navigation", path: "navigation.maxDepth" },
    });
  }

  if (designAdded.length > 0 || designRemoved.length > 0) {
    items.push({
      id: "design-diff",
      kind: "designSystemComponents",
      label: "Design system usage changed",
      details: `+${designAdded.length} / -${designRemoved.length}`,
      evolve: { tab: "generation", path: "generation.mustUseDesignTokens" },
    });
  }

  if (current.extracted?.authAware !== latest.extracted?.authAware) {
    items.push({
      id: "authaware-diff",
      kind: "authAware",
      label: "authAware changed",
      details: `${String(current.extracted?.authAware)} -> ${String(latest.extracted?.authAware)}`,
      evolve: { tab: "generation", path: "generation.structuralChangesRequireReview" },
    });
  }

  if (current.extracted?.hasShell !== latest.extracted?.hasShell) {
    items.push({
      id: "hasshell-diff",
      kind: "hasShell",
      label: "Shell structure changed",
      details: `${String(current.extracted?.hasShell)} -> ${String(latest.extracted?.hasShell)}`,
      evolve: { tab: "layout", path: "layout.requireGlobalHeader" },
    });
  }

  return items;
}
