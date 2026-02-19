import { getSession, requireSession } from "@surfaces/platform-auth";
import { headers } from "next/headers";
import { getDefaultWorkspaceId, normalizeWorkspaceId } from "./workspace";

export interface WorkspaceSession {
  session: {
    workspaceId: string;
  } & Record<string, unknown>;
  workspaceId: string;
}

function buildRequestFromHeadersMap(values: Record<string, string>): Request {
  return new Request("http://localhost", {
    headers: values,
  });
}

export async function getWorkspaceIdFromCurrentRequest(): Promise<string> {
  const headersList = await headers();
  const req = buildRequestFromHeadersMap(Object.fromEntries(headersList.entries()));
  const result = await getSession(req);
  if (!result.ok) return getDefaultWorkspaceId();
  return normalizeWorkspaceId(result.session.workspaceId);
}

export async function requireWorkspaceSession(request: Request): Promise<WorkspaceSession> {
  const session = await requireSession(request);
  return {
    session,
    workspaceId: normalizeWorkspaceId(session.workspaceId),
  };
}

export async function getWorkspaceSession(request: Request): Promise<WorkspaceSession | null> {
  const result = await getSession(request);
  if (!result.ok) return null;
  return {
    session: result.session,
    workspaceId: normalizeWorkspaceId(result.session.workspaceId),
  };
}

export function resolveWorkspaceIdFromSession(
  session: { workspaceId?: string } | null | undefined,
): string {
  if (!session) return getDefaultWorkspaceId();
  return normalizeWorkspaceId(session.workspaceId);
}
