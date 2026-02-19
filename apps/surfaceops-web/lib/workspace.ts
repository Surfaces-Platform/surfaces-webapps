export const DEFAULT_WORKSPACE_ID = "ws-local-default";

export function sanitizeWorkspaceIdSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized.length === 0) return DEFAULT_WORKSPACE_ID;
  return normalized.slice(0, 96);
}

export function normalizeWorkspaceId(value: string | null | undefined): string {
  if (!value) return getDefaultWorkspaceId();
  return sanitizeWorkspaceIdSegment(value);
}

export function getDefaultWorkspaceId(): string {
  const configured = process.env.SURFACEOPS_DEFAULT_WORKSPACE_ID;
  if (!configured || configured.trim().length === 0) {
    return DEFAULT_WORKSPACE_ID;
  }
  return sanitizeWorkspaceIdSegment(configured);
}
