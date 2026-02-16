import type { SurfaceContract } from "../../_lib/types";

export type InspectorCategory =
  | "layout"
  | "navigation"
  | "generation"
  | "drift"
  | "sections"
  | "tokens"
  | "other";

export type InspectorSeverity = "blocking" | "warning" | "info";

export type ReliabilityTier = "full" | "degraded";

export type ReliabilityReason =
  | "byo_target"
  | "telemetry_unavailable"
  | "missing_marker_fidelity"
  | "baseline_unavailable";

export interface InspectorNodeRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface InspectorNode {
  nodeId: string;
  sectionId?: string;
  role?: string;
  label: string;
  tagName: string;
  rect: InspectorNodeRect;
  parentNodeId?: string;
  attributes: Record<string, string>;
  style: {
    inline: string;
    color?: string;
    backgroundColor?: string;
    navDepth?: number;
  };
}

export interface InspectorDomSnapshot {
  nodes: InspectorNode[];
  capturedAt: string;
}

export interface InspectorViolation {
  id: string;
  category: InspectorCategory;
  severity: InspectorSeverity;
  title: string;
  message: string;
  rulePath: string;
  nodeIds: string[];
  confidence: "high" | "medium";
  heuristic: boolean;
}

export interface InspectorState {
  selectedViolationId?: string;
  selectedNodeId?: string;
  panelWidth: number;
  activeCategory: InspectorCategory | "all";
}

export interface InspectorCheckContext {
  contractDraft: SurfaceContract;
  domSnapshot: InspectorDomSnapshot;
  requiredSections: string[];
  reliabilityTier: ReliabilityTier;
  reliabilityReasons: ReliabilityReason[];
}

export interface InspectorRulePlugin {
  id: string;
  category: InspectorCategory;
  markerDependent?: boolean;
  confidence: "high" | "medium";
  heuristic: boolean;
  evaluate: (ctx: InspectorCheckContext) => InspectorViolation[];
}

export interface InspectorTargetBaselineRecord {
  targetUrl: string;
  contract: SurfaceContract;
  requiredSections: string[];
  sourceSnapshotCapturedAt: string;
  createdAt: string;
  updatedAt: string;
}
