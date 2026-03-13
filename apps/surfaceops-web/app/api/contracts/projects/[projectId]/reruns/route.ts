import { requireWorkspaceSession } from "@/lib/workspace-auth";
import { createProjectRerun } from "@/lib/contract-workbench/service";

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
    const run = await createProjectRerun(workspaceId, projectId, payload);
    return Response.json({ ok: true, run }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: message.includes("required") ? 400 : 500 });
  }
}
