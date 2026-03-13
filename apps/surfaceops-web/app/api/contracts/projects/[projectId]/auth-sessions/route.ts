import { requireWorkspaceSession } from "@/lib/workspace-auth";
import { saveProjectAuthSessionState } from "@/lib/contract-workbench/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const { workspaceId } = await requireWorkspaceSession(request);
    const { projectId } = await context.params;
    const payload = await request.json().catch(() => {
      throw new Error("Invalid JSON payload.");
    });
    if (!payload || typeof payload !== "object") {
      throw new Error("Auth session payload is required.");
    }
    const storageState = payload.storageState;
    if (!storageState || typeof storageState !== "object" || Array.isArray(storageState)) {
      throw new Error("storageState must be a JSON object.");
    }
    const result = await saveProjectAuthSessionState({
      workspaceId,
      projectId,
      authSessionKey: String(payload.authSessionKey ?? ""),
      surfaceId: String(payload.surfaceId ?? ""),
      environmentId: String(payload.environmentId ?? "preview"),
      previewOrigin: String(payload.previewOrigin ?? ""),
      storageState: storageState as Record<string, unknown>,
      expiresAt: typeof payload.expiresAt === "string" ? payload.expiresAt : null,
    });
    return Response.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: message.includes("required") ? 400 : 500 });
  }
}
