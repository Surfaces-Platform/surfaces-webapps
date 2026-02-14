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
  decisionState: "accept" | "reject" | "evolve" | null;
  lastDecisionAt: string | null;
  evolve: {
    tab: "layout" | "navigation" | "generation" | "drift";
    path: string;
  };
}

type DiffDecisionMap = Record<
  string,
  {
    action: "accept" | "reject" | "evolve";
    createdAt: string;
  }
>;

function toSet(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter((entry): entry is string => typeof entry === "string"));
}

function decisionState(
  decisions: DiffDecisionMap | undefined,
  diffItemId: string,
): { decisionState: "accept" | "reject" | "evolve" | null; lastDecisionAt: string | null } {
  if (!decisions || !decisions[diffItemId]) {
    return { decisionState: null, lastDecisionAt: null };
  }
  return {
    decisionState: decisions[diffItemId].action,
    lastDecisionAt: decisions[diffItemId].createdAt,
  };
}

export function buildExtractionDiff(
  baseline: ExtractionShape,
  selected: ExtractionShape,
  decisions?: DiffDecisionMap,
): ExtractionDiffItem[] {
  const baselineRoutes = toSet(baseline.extracted?.routes);
  const selectedRoutes = toSet(selected.extracted?.routes);
  const baselineDesign = toSet(baseline.extracted?.designSystemComponents);
  const selectedDesign = toSet(selected.extracted?.designSystemComponents);

  const routesAdded = [...selectedRoutes].filter((route) => !baselineRoutes.has(route));
  const routesRemoved = [...baselineRoutes].filter((route) => !selectedRoutes.has(route));
  const designAdded = [...selectedDesign].filter((name) => !baselineDesign.has(name));
  const designRemoved = [...baselineDesign].filter((name) => !selectedDesign.has(name));

  const items: ExtractionDiffItem[] = [];

  if (routesAdded.length > 0 || routesRemoved.length > 0) {
    items.push({
      id: "routes-diff",
      kind: "routes",
      label: "Route map changed",
      details: `+${routesAdded.length} / -${routesRemoved.length}`,
      ...decisionState(decisions, "routes-diff"),
      evolve: { tab: "navigation", path: "navigation.maxDepth" },
    });
  }

  if (designAdded.length > 0 || designRemoved.length > 0) {
    items.push({
      id: "design-diff",
      kind: "designSystemComponents",
      label: "Design system usage changed",
      details: `+${designAdded.length} / -${designRemoved.length}`,
      ...decisionState(decisions, "design-diff"),
      evolve: { tab: "generation", path: "generation.mustUseDesignTokens" },
    });
  }

  if (baseline.extracted?.authAware !== selected.extracted?.authAware) {
    items.push({
      id: "authaware-diff",
      kind: "authAware",
      label: "authAware changed",
      details: `${String(baseline.extracted?.authAware)} -> ${String(selected.extracted?.authAware)}`,
      ...decisionState(decisions, "authaware-diff"),
      evolve: { tab: "generation", path: "generation.structuralChangesRequireReview" },
    });
  }

  if (baseline.extracted?.hasShell !== selected.extracted?.hasShell) {
    items.push({
      id: "hasshell-diff",
      kind: "hasShell",
      label: "Shell structure changed",
      details: `${String(baseline.extracted?.hasShell)} -> ${String(selected.extracted?.hasShell)}`,
      ...decisionState(decisions, "hasshell-diff"),
      evolve: { tab: "layout", path: "layout.requireGlobalHeader" },
    });
  }

  return items;
}
