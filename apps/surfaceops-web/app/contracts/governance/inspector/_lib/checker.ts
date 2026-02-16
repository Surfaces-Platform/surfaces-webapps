import type {
  InspectorCheckContext,
  InspectorRulePlugin,
  InspectorViolation,
  InspectorNode,
} from "./types";

type ViolationDraft = Omit<
  InspectorViolation,
  "id" | "category" | "confidence" | "heuristic"
>;

function byTag(nodes: InspectorNode[], tagName: string): InspectorNode[] {
  return nodes.filter((node) => node.tagName.toLowerCase() === tagName.toLowerCase());
}

function byRole(nodes: InspectorNode[], role: string): InspectorNode[] {
  return nodes.filter((node) => node.role?.toLowerCase() === role.toLowerCase());
}

function byAttr(nodes: InspectorNode[], key: string, value?: string): InspectorNode[] {
  if (value === undefined) {
    return nodes.filter((node) => key in node.attributes);
  }
  return nodes.filter((node) => node.attributes[key] === value);
}

function hasTruthyAttr(node: InspectorNode, key: string): boolean {
  const value = node.attributes[key];
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "present"
  );
}

function reliabilitySuffix(ctx: InspectorCheckContext): string {
  if (ctx.reliabilityTier === "full") return "";
  if (ctx.reliabilityReasons.length === 0) {
    return " Severity reduced because this run is in degraded reliability mode.";
  }
  return ` Severity reduced because reliability is degraded (${ctx.reliabilityReasons.join(", ")}).`;
}

function toViolation(
  id: string,
  plugin: InspectorRulePlugin,
  ctx: InspectorCheckContext,
  partial: ViolationDraft,
): InspectorViolation {
  const downgraded =
    ctx.reliabilityTier === "degraded" &&
    plugin.markerDependent &&
    partial.severity === "blocking";

  return {
    id,
    category: plugin.category,
    severity: downgraded ? "warning" : partial.severity,
    title: partial.title,
    message: downgraded ? `${partial.message}${reliabilitySuffix(ctx)}` : partial.message,
    rulePath: partial.rulePath,
    nodeIds: partial.nodeIds,
    confidence: downgraded ? "medium" : plugin.confidence,
    heuristic: downgraded ? true : plugin.heuristic,
  };
}

const layoutRequirePageContainerRule: InspectorRulePlugin = {
  id: "layout.requirePageContainer",
  category: "layout",
  markerDependent: true,
  confidence: "medium",
  heuristic: true,
  evaluate: (ctx) => {
    if (!ctx.contractDraft.layout.requirePageContainer) return [];
    const containerNodes = byAttr(ctx.domSnapshot.nodes, "data-contract", "page-container");
    const semanticContainers = byTag(ctx.domSnapshot.nodes, "main");
    if (containerNodes.length > 0 || semanticContainers.length > 0) return [];
    return [
      toViolation("layout.requirePageContainer", layoutRequirePageContainerRule, ctx, {
        severity: "blocking",
        title: "Page container missing",
        message:
          "Required page container marker (`data-contract=page-container`) or semantic `<main>` region was not found.",
        rulePath: "layout.requirePageContainer",
        nodeIds: [],
      }),
    ];
  },
};

function collectPrimaryNavNodes(nodes: InspectorNode[]): InspectorNode[] {
  const navCandidates = [...byTag(nodes, "nav"), ...byRole(nodes, "navigation")];
  const unique = new Map<string, InspectorNode>();
  for (const node of navCandidates) unique.set(node.nodeId, node);
  return [...unique.values()];
}

const layoutRequireGlobalHeaderRule: InspectorRulePlugin = {
  id: "layout.requireGlobalHeader",
  category: "layout",
  markerDependent: true,
  confidence: "medium",
  heuristic: true,
  evaluate: (ctx) => {
    if (!ctx.contractDraft.layout.requireGlobalHeader) return [];
    const headerNodes = [
      ...byAttr(ctx.domSnapshot.nodes, "data-contract", "global-header"),
      ...byTag(ctx.domSnapshot.nodes, "header"),
      ...byRole(ctx.domSnapshot.nodes, "banner"),
      ...collectPrimaryNavNodes(ctx.domSnapshot.nodes),
    ];
    if (headerNodes.length > 0) return [];
    return [
      toViolation("layout.requireGlobalHeader", layoutRequireGlobalHeaderRule, ctx, {
        severity: "blocking",
        title: "Global header missing",
        message:
          "No header/banner node or `data-contract=global-header` marker was detected for a contract requiring global header.",
        rulePath: "layout.requireGlobalHeader",
        nodeIds: [],
      }),
    ];
  },
};

const navigationSinglePrimaryRule: InspectorRulePlugin = {
  id: "navigation.requireSinglePrimaryNav",
  category: "navigation",
  confidence: "high",
  heuristic: false,
  evaluate: (ctx) => {
    if (!ctx.contractDraft.navigation.requireSinglePrimaryNav) return [];
    const primary = collectPrimaryNavNodes(ctx.domSnapshot.nodes);
    if (primary.length === 1) return [];
    return [
      toViolation("navigation.requireSinglePrimaryNav", navigationSinglePrimaryRule, ctx, {
        severity: "blocking",
        title: "Expected single primary navigation",
        message: `Detected ${primary.length} primary navigation regions; contract expects exactly one.`,
        rulePath: "navigation.requireSinglePrimaryNav",
        nodeIds: primary.map((node) => node.nodeId),
      }),
    ];
  },
};

const navigationDuplicateRule: InspectorRulePlugin = {
  id: "navigation.disallowDuplicateNavigation",
  category: "navigation",
  confidence: "high",
  heuristic: false,
  evaluate: (ctx) => {
    if (!ctx.contractDraft.navigation.disallowDuplicateNavigation) return [];
    const navNodes = collectPrimaryNavNodes(ctx.domSnapshot.nodes);
    if (navNodes.length <= 1) return [];
    return [
      toViolation("navigation.disallowDuplicateNavigation", navigationDuplicateRule, ctx, {
        severity: "blocking",
        title: "Duplicate navigation detected",
        message: "More than one primary navigation region detected.",
        rulePath: "navigation.disallowDuplicateNavigation",
        nodeIds: navNodes.map((node) => node.nodeId),
      }),
    ];
  },
};

const navigationDepthRule: InspectorRulePlugin = {
  id: "navigation.maxDepth",
  category: "navigation",
  confidence: "high",
  heuristic: false,
  evaluate: (ctx) => {
    const navNodes = collectPrimaryNavNodes(ctx.domSnapshot.nodes);
    if (navNodes.length === 0) return [];
    let maxDepth = 1;
    let maxNode: InspectorNode | null = null;
    for (const node of navNodes) {
      const depth = node.style.navDepth ?? 1;
      if (depth > maxDepth) {
        maxDepth = depth;
        maxNode = node;
      }
    }
    if (maxDepth <= ctx.contractDraft.navigation.maxDepth) return [];
    return [
      toViolation("navigation.maxDepth", navigationDepthRule, ctx, {
        severity: "warning",
        title: "Navigation depth exceeded",
        message: `Detected navigation depth ${maxDepth}, allowed max is ${ctx.contractDraft.navigation.maxDepth}.`,
        rulePath: "navigation.maxDepth",
        nodeIds: maxNode ? [maxNode.nodeId] : [],
      }),
    ];
  },
};

const sectionsRequiredRule: InspectorRulePlugin = {
  id: "sections.required",
  category: "sections",
  markerDependent: true,
  confidence: "medium",
  heuristic: true,
  evaluate: (ctx) => {
    const filteredRequired = ctx.requiredSections.filter(
      (sectionId) =>
        sectionId.trim().length > 0 &&
        !sectionId.startsWith("extracted.") &&
        sectionId !== "extracted.placeholder",
    );
    if (filteredRequired.length === 0) return [];
    const present = new Set(
      byAttr(ctx.domSnapshot.nodes, "data-contract-section").map(
        (node) => node.attributes["data-contract-section"],
      ),
    );
    const missing = filteredRequired.filter((sectionId) => !present.has(sectionId));
    if (missing.length === 0) return [];
    return missing.map((sectionId, idx) =>
      toViolation(`sections.required.${idx + 1}`, sectionsRequiredRule, ctx, {
        severity: "blocking",
        title: "Required section missing",
        message: `Section "${sectionId}" is required by contract and was not found in preview telemetry.`,
        rulePath: "sections.required",
        nodeIds: [],
      }),
    );
  },
};

const nng5ErrorPreventionRule: InspectorRulePlugin = {
  id: "nng.5.error-prevention",
  category: "generation",
  markerDependent: true,
  confidence: "medium",
  heuristic: true,
  evaluate: (ctx) => {
    if (!ctx.contractDraft.generation.structuralChangesRequireReview) return [];
    const destructiveNodes = ctx.domSnapshot.nodes.filter((node) => {
      const risk = node.attributes["data-contract-action-risk"];
      if (!risk) return false;
      return risk.trim().toLowerCase() === "destructive";
    });
    if (destructiveNodes.length === 0) return [];
    const offenders = destructiveNodes.filter(
      (node) =>
        !hasTruthyAttr(node, "data-contract-guard-confirm") &&
        !hasTruthyAttr(node, "data-contract-guard-undo"),
    );
    if (offenders.length === 0) return [];
    return offenders.slice(0, 50).map((node, idx) =>
      toViolation(`nng.5.error-prevention.${idx + 1}`, nng5ErrorPreventionRule, ctx, {
        severity: "blocking",
        title: "Destructive action missing guard",
        message:
          `Action "${node.label}" is marked destructive but has neither confirmation nor undo guard marker.`,
        rulePath: "nng.5.error-prevention",
        nodeIds: [node.nodeId],
      }),
    );
  },
};

const tokenRule: InspectorRulePlugin = {
  id: "generation.mustUseDesignTokens",
  category: "tokens",
  confidence: "medium",
  heuristic: true,
  evaluate: (ctx) => {
    if (!ctx.contractDraft.generation.mustUseDesignTokens) return [];
    const rawColorPattern = /(#([0-9a-f]{3,8})\b|rgba?\(|hsla?\()/i;
    const offenders = ctx.domSnapshot.nodes.filter(
      (node) =>
        typeof node.style.inline === "string" &&
        node.style.inline.length > 0 &&
        rawColorPattern.test(node.style.inline),
    );
    return offenders.slice(0, 50).map((node, idx) =>
      toViolation(`generation.mustUseDesignTokens.${idx + 1}`, tokenRule, ctx, {
        severity: "warning",
        title: "Raw style value detected",
        message: `Node "${node.label}" has inline raw color/style values; use design tokens.`,
        rulePath: "generation.mustUseDesignTokens",
        nodeIds: [node.nodeId],
      }),
    );
  },
};

const plugins: InspectorRulePlugin[] = [
  layoutRequirePageContainerRule,
  layoutRequireGlobalHeaderRule,
  navigationSinglePrimaryRule,
  navigationDuplicateRule,
  navigationDepthRule,
  sectionsRequiredRule,
  nng5ErrorPreventionRule,
  tokenRule,
];

export function runInspectorChecks(ctx: InspectorCheckContext): InspectorViolation[] {
  const violations = plugins.flatMap((plugin) => plugin.evaluate(ctx));
  return violations.sort((a, b) => {
    const severityRank = { blocking: 0, warning: 1, info: 2 } as const;
    if (severityRank[a.severity] !== severityRank[b.severity]) {
      return severityRank[a.severity] - severityRank[b.severity];
    }
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.title.localeCompare(b.title);
  });
}
