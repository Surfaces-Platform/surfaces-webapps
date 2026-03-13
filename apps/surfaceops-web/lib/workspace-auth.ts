import { getSession, requireSession } from "@surfaces/platform-auth";
import { headers } from "next/headers";
import { isSurfaceOpsAuthBypassEnabled } from "./auth-bypass";
import { getDefaultWorkspaceId, normalizeWorkspaceId } from "./workspace";

export interface WorkspaceSession {
  session: {
    workspaceId: string;
  } & Record<string, unknown>;
  workspaceId: string;
}

function shouldBypassWorkspaceAuth(): boolean {
  return isSurfaceOpsAuthBypassEnabled();
}

function buildBypassWorkspaceSession(): WorkspaceSession {
  const workspaceId = normalizeWorkspaceId(
    process.env.SURFACEOPS_TEST_WORKSPACE_ID || getDefaultWorkspaceId(),
  );
  return {
    workspaceId,
    session: {
      workspaceId,
      userId: "surfaceops-test-bypass",
      email: "surfaceops-test-bypass@local",
      name: "SurfaceOps Test Bypass",
      roles: ["operator"],
      surfaceAccess: ["*"],
      authMode: "test-bypass",
    },
  };
}

function buildRequestFromHeadersMap(values: Record<string, string>): Request {
  return new Request("http://localhost", {
    headers: values,
  });
}

export async function getWorkspaceIdFromCurrentRequest(): Promise<string> {
  if (shouldBypassWorkspaceAuth()) {
    return buildBypassWorkspaceSession().workspaceId;
  }
  const headersList = await headers();
  const req = buildRequestFromHeadersMap(Object.fromEntries(headersList.entries()));
  const result = await getSession(req);
  if (!result.ok) return getDefaultWorkspaceId();
  return normalizeWorkspaceId(result.session.workspaceId);
}

export async function requireWorkspaceSession(request: Request): Promise<WorkspaceSession> {
  if (shouldBypassWorkspaceAuth()) {
    return buildBypassWorkspaceSession();
  }
  const session = await requireSession(request);
  return {
    session,
    workspaceId: normalizeWorkspaceId(session.workspaceId),
  };
}

export async function getWorkspaceSession(request: Request): Promise<WorkspaceSession | null> {
  if (shouldBypassWorkspaceAuth()) {
    return buildBypassWorkspaceSession();
  }
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
