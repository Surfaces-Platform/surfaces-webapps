import { requireWorkspaceSession } from "@/lib/workspace-auth";
import { loadProjectWorkspace, saveProjectDraftText } from "@/lib/contract-workbench/service";

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const { workspaceId } = await requireWorkspaceSession(request);
    const { projectId } = await context.params;
    const workspace = await loadProjectWorkspace(workspaceId, projectId);
    return Response.json({ ok: true, draft: workspace.draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const { workspaceId } = await requireWorkspaceSession(request);
    const { projectId } = await context.params;
    const payload = await request.json().catch(() => {
      throw new Error("Invalid JSON payload.");
    });
    if (typeof payload?.text !== "string") {
      throw new Error("text is required.");
    }
    const draft = await saveProjectDraftText(workspaceId, projectId, payload.text);
    return Response.json({ ok: true, draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: message.includes("required") ? 400 : 500 });
  }
}
