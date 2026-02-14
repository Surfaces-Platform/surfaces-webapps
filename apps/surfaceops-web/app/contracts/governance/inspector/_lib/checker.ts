import type {
  InspectorCheckContext,
  InspectorRulePlugin,
  InspectorViolation,
  InspectorNode,
} from "./types";

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

function toViolation(
  id: string,
  plugin: InspectorRulePlugin,
  partial: Omit<InspectorViolation, "id" | "category">,
): InspectorViolation {
  return {
    id,
    category: plugin.category,
    ...partial,
  };
}

const layoutRequirePageContainerRule: InspectorRulePlugin = {
  id: "layout.requirePageContainer",
  category: "layout",
  evaluate: ({ contractDraft, domSnapshot }) => {
    if (!contractDraft.layout.requirePageContainer) return [];
    const containerNodes = byAttr(domSnapshot.nodes, "data-contract", "page-container");
    if (containerNodes.length > 0) return [];
    return [
      {
        id: "layout.requirePageContainer",
        category: "layout",
        severity: "blocking",
        title: "Page container missing",
        message: "Required page container marker (`data-contract=page-container`) was not found.",
        rulePath: "layout.requirePageContainer",
        nodeIds: [],
      },
    ];
  },
};

const layoutRequireGlobalHeaderRule: InspectorRulePlugin = {
  id: "layout.requireGlobalHeader",
  category: "layout",
  evaluate: ({ contractDraft, domSnapshot }) => {
    if (!contractDraft.layout.requireGlobalHeader) return [];
    const headerNodes = [
      ...byTag(domSnapshot.nodes, "header"),
      ...byRole(domSnapshot.nodes, "banner"),
      ...collectPrimaryNavNodes(domSnapshot.nodes),
    ];
    if (headerNodes.length > 0) return [];
    return [
      {
        id: "layout.requireGlobalHeader",
        category: "layout",
        severity: "blocking",
        title: "Global header missing",
        message: "No header/banner node was detected for a contract requiring global header.",
        rulePath: "layout.requireGlobalHeader",
        nodeIds: [],
      },
    ];
  },
};

function collectPrimaryNavNodes(nodes: InspectorNode[]): InspectorNode[] {
  const navCandidates = [...byTag(nodes, "nav"), ...byRole(nodes, "navigation")];
  const unique = new Map<string, InspectorNode>();
  for (const node of navCandidates) unique.set(node.nodeId, node);
  return [...unique.values()];
}

const navigationSinglePrimaryRule: InspectorRulePlugin = {
  id: "navigation.requireSinglePrimaryNav",
  category: "navigation",
  evaluate: ({ contractDraft, domSnapshot }) => {
    if (!contractDraft.navigation.requireSinglePrimaryNav) return [];
    const primary = collectPrimaryNavNodes(domSnapshot.nodes);
    if (primary.length === 1) return [];
    return [
      {
        id: "navigation.requireSinglePrimaryNav",
        category: "navigation",
        severity: "blocking",
        title: "Expected single primary navigation",
        message: `Detected ${primary.length} primary navigation regions; contract expects exactly one.`,
        rulePath: "navigation.requireSinglePrimaryNav",
        nodeIds: primary.map((node) => node.nodeId),
      },
    ];
  },
};

const navigationDuplicateRule: InspectorRulePlugin = {
  id: "navigation.disallowDuplicateNavigation",
  category: "navigation",
  evaluate: ({ contractDraft, domSnapshot }) => {
    if (!contractDraft.navigation.disallowDuplicateNavigation) return [];
    const navNodes = collectPrimaryNavNodes(domSnapshot.nodes);
    if (navNodes.length <= 1) return [];
    return [
      {
        id: "navigation.disallowDuplicateNavigation",
        category: "navigation",
        severity: "blocking",
        title: "Duplicate navigation detected",
        message: "More than one primary navigation region detected.",
        rulePath: "navigation.disallowDuplicateNavigation",
        nodeIds: navNodes.map((node) => node.nodeId),
      },
    ];
  },
};

const navigationDepthRule: InspectorRulePlugin = {
  id: "navigation.maxDepth",
  category: "navigation",
  evaluate: ({ contractDraft, domSnapshot }) => {
    const navNodes = collectPrimaryNavNodes(domSnapshot.nodes);
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
    if (maxDepth <= contractDraft.navigation.maxDepth) return [];
    return [
      {
        id: "navigation.maxDepth",
        category: "navigation",
        severity: "warning",
        title: "Navigation depth exceeded",
        message: `Detected navigation depth ${maxDepth}, allowed max is ${contractDraft.navigation.maxDepth}.`,
        rulePath: "navigation.maxDepth",
        nodeIds: maxNode ? [maxNode.nodeId] : [],
      },
    ];
  },
};

const sectionsRequiredRule: InspectorRulePlugin = {
  id: "sections.required",
  category: "sections",
  evaluate: ({ requiredSections, domSnapshot }) => {
    const filteredRequired = requiredSections.filter(
      (sectionId) =>
        sectionId.trim().length > 0 &&
        !sectionId.startsWith("extracted.") &&
        sectionId !== "extracted.placeholder",
    );
    if (filteredRequired.length === 0) return [];
    const present = new Set(
      byAttr(domSnapshot.nodes, "data-contract-section").map(
        (node) => node.attributes["data-contract-section"],
      ),
    );
    const missing = filteredRequired.filter((sectionId) => !present.has(sectionId));
    if (missing.length === 0) return [];
    return missing.map((sectionId, idx) => ({
      id: `sections.required.${idx + 1}`,
      category: "sections" as const,
      severity: "blocking" as const,
      title: "Required section missing",
      message: `Section "${sectionId}" is required by contract and was not found in preview.`,
      rulePath: "sections.required",
      nodeIds: [],
    }));
  },
};

const tokenRule: InspectorRulePlugin = {
  id: "generation.mustUseDesignTokens",
  category: "tokens",
  evaluate: ({ contractDraft, domSnapshot }) => {
    if (!contractDraft.generation.mustUseDesignTokens) return [];
    const rawColorPattern = /(#([0-9a-f]{3,8})\b|rgba?\(|hsla?\()/i;
    const offenders = domSnapshot.nodes.filter(
      (node) =>
        typeof node.style.inline === "string" &&
        node.style.inline.length > 0 &&
        rawColorPattern.test(node.style.inline),
    );
    return offenders.slice(0, 50).map((node, idx) =>
      toViolation(`generation.mustUseDesignTokens.${idx + 1}`, tokenRule, {
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
