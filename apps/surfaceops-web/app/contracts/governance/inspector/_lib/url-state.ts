export type InspectorPanelState = "default" | "details";

export interface InspectorUrlState {
  prototype: string;
  snapshot: string;
  route: string;
  violation?: string;
  node?: string;
  panel: InspectorPanelState;
  category?: string;
}

const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i;
const DOMAIN_OR_HOST_PATTERN =
  /^(localhost(?::\d+)?|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9-]+\.)+[a-z]{2,})(?:\/.*)?$/i;

export function isAbsoluteHttpUrl(value: string): boolean {
  return ABSOLUTE_HTTP_URL_PATTERN.test(value.trim());
}

export function normalizeInspectorRouteInput(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "/";
  if (isAbsoluteHttpUrl(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return trimmed;
  if (DOMAIN_OR_HOST_PATTERN.test(trimmed)) return `https://${trimmed}`;
  return `/${trimmed.replace(/^\/+/, "")}`;
}

export function readInspectorUrlState(input: {
  prototype?: string;
  snapshot?: string;
  route?: string;
  violation?: string;
  node?: string;
  panel?: string;
  category?: string;
}): InspectorUrlState {
  const normalizedRoute = normalizeInspectorRouteInput(input.route);
  return {
    prototype: input.prototype ?? "p0004",
    snapshot: input.snapshot ?? "",
    route: normalizedRoute,
    violation: input.violation ?? undefined,
    node: input.node ?? undefined,
    panel: input.panel === "details" ? "details" : "default",
    category: input.category ?? undefined,
  };
}

export function buildInspectorQuery(state: InspectorUrlState): string {
  const params = new URLSearchParams();
  params.set("prototype", state.prototype);
  if (state.snapshot) params.set("snapshot", state.snapshot);
  params.set("route", state.route);
  if (state.violation) params.set("violation", state.violation);
  if (state.node) params.set("node", state.node);
  if (state.panel === "details") params.set("panel", "details");
  if (state.category) params.set("category", state.category);
  return params.toString();
}
