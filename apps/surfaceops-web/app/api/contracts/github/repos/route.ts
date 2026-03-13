import { requireWorkspaceSession } from "@/lib/workspace-auth";
import { discoverGithubRepos } from "@/lib/contract-workbench/service";

export async function POST(request: Request): Promise<Response> {
  try {
    await requireWorkspaceSession(request);
    const payload = await request.json().catch(() => {
      throw new Error("Invalid JSON payload.");
    });
    const token = typeof payload?.token === "string" ? payload.token : "";
    const owner = typeof payload?.owner === "string" ? payload.owner : undefined;
    const repos = await discoverGithubRepos(token, owner);
    return Response.json({ ok: true, repos });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: message.includes("required") ? 400 : 500 });
  }
}
