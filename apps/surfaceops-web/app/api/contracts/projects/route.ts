import { requireWorkspaceSession } from "@/lib/workspace-auth";
import { createConnectedProjectFromGithub, listProjectsForWorkspace } from "@/lib/contract-workbench/service";

export async function GET(request: Request): Promise<Response> {
  try {
    const { workspaceId } = await requireWorkspaceSession(request);
    const projects = await listProjectsForWorkspace(workspaceId);
    return Response.json({ ok: true, projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { workspaceId } = await requireWorkspaceSession(request);
    const payload = await request.json().catch(() => {
      throw new Error("Invalid JSON payload.");
    });
    const project = await createConnectedProjectFromGithub(workspaceId, payload);
    return Response.json({ ok: true, project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: message.includes("required") ? 400 : 500 });
  }
}
