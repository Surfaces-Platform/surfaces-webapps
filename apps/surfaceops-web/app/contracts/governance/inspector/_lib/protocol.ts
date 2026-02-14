import type { InspectorDomSnapshot, InspectorViolation } from "./types";

export const INSPECTOR_CHANNEL = "surfaceops-governance-inspector-v1";
export const INSPECTOR_VERSION = 1;

type EnvelopeBase = {
  channel: typeof INSPECTOR_CHANNEL;
  version: typeof INSPECTOR_VERSION;
};

export type InspectorParentMessage =
  | (EnvelopeBase & { type: "INSPECTOR_INIT" })
  | (EnvelopeBase & { type: "REQUEST_DOM_SNAPSHOT" })
  | (EnvelopeBase & {
      type: "HIGHLIGHT_VIOLATIONS";
      violations: InspectorViolation[];
      selectedViolationId?: string;
    })
  | (EnvelopeBase & { type: "SELECT_NODE"; nodeId?: string })
  | (EnvelopeBase & { type: "CLEAR_HIGHLIGHTS" });

export type InspectorIframeMessage =
  | (EnvelopeBase & { type: "INSPECTOR_READY" })
  | (EnvelopeBase & { type: "DOM_SNAPSHOT"; snapshot: InspectorDomSnapshot })
  | (EnvelopeBase & { type: "NODE_SELECTED"; nodeId: string })
  | (EnvelopeBase & { type: "HOVER_NODE"; nodeId: string });

export function isInspectorMessage(value: unknown): value is EnvelopeBase & { type: string } {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.channel === INSPECTOR_CHANNEL &&
    payload.version === INSPECTOR_VERSION &&
    typeof payload.type === "string"
  );
}
