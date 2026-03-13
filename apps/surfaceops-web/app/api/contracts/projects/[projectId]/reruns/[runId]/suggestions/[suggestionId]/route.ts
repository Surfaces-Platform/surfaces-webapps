import { requireWorkspaceSession } from "@/lib/workspace-auth";
import { reviewProjectSuggestion } from "@/lib/contract-workbench/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; runId: string; suggestionId: string }> },
): Promise<Response> {
  try {
    const { workspaceId } = await requireWorkspaceSession(request);
    const { projectId, runId, suggestionId } = await context.params;
    const payload = await request.json().catch(() => {
      throw new Error("Invalid JSON payload.");
    });
    const result = await reviewProjectSuggestion(workspaceId, projectId, suggestionId, {
      runId,
      decision: payload?.decision,
      rationale: payload?.rationale,
    });
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: message.includes("required") ? 400 : 500 });
  }
}
