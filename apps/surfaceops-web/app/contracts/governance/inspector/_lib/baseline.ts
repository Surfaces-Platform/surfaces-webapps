import { makeDefaultContract } from "../../_lib/default-contract";
import type { InspectorDomSnapshot, InspectorNode } from "./types";
import type { SurfaceContract } from "../../_lib/types";

type DerivedInspectorBaseline = {
  contract: SurfaceContract;
  requiredSections: string[];
};

function byTag(nodes: InspectorNode[], tagName: string): InspectorNode[] {
  return nodes.filter((node) => node.tagName.toLowerCase() === tagName.toLowerCase());
}

function byRole(nodes: InspectorNode[], role: string): InspectorNode[] {
  return nodes.filter((node) => node.role?.toLowerCase() === role.toLowerCase());
}

function byAttr(nodes: InspectorNode[], key: string, value?: string): InspectorNode[] {
  if (value === undefined) return nodes.filter((node) => key in node.attributes);
  return nodes.filter((node) => node.attributes[key] === value);
}

function collectPrimaryNavNodes(nodes: InspectorNode[]): InspectorNode[] {
  const navCandidates = [...byTag(nodes, "nav"), ...byRole(nodes, "navigation")];
  const byId = new Map<string, InspectorNode>();
  for (const node of navCandidates) byId.set(node.nodeId, node);
  const navIds = new Set(byId.keys());
  const topLevel = [...byId.values()].filter(
    (node) => !node.parentNodeId || !navIds.has(node.parentNodeId),
  );
  return topLevel.length > 0 ? topLevel : [...byId.values()];
}

function clampDepth(value: number): number {
  return Math.min(6, Math.max(1, Math.round(value)));
}

export function deriveInspectorBaselineFromSnapshot(
  snapshot: InspectorDomSnapshot,
): DerivedInspectorBaseline {
  const contract = makeDefaultContract("app");
  const nodes = snapshot.nodes;

  const headerOrBanner = [...byTag(nodes, "header"), ...byRole(nodes, "banner")];
  const primaryNavNodes = collectPrimaryNavNodes(nodes);
  const hasHeaderLike = headerOrBanner.length > 0 || primaryNavNodes.length > 0;
  const hasPageContainer =
    byAttr(nodes, "data-contract", "page-container").length > 0 ||
    byTag(nodes, "main").length > 0;
  const maxNavDepth = primaryNavNodes.reduce(
    (max, node) => Math.max(max, node.style.navDepth ?? 1),
    1,
  );

  contract.layout.requireGlobalHeader = hasHeaderLike;
  contract.layout.requirePageContainer = hasPageContainer;
  contract.navigation.requireSinglePrimaryNav = primaryNavNodes.length <= 1;
  contract.navigation.disallowDuplicateNavigation = primaryNavNodes.length <= 1;
  contract.navigation.maxDepth = clampDepth(maxNavDepth);
  contract.generation.mustUseDesignTokens = false;

  const requiredSections = [...new Set(
    byAttr(nodes, "data-contract-section")
      .map((node) => node.attributes["data-contract-section"]?.trim())
      .filter((value): value is string => Boolean(value && value.length > 0)),
  )];

  return {
    contract,
    requiredSections,
  };
}
