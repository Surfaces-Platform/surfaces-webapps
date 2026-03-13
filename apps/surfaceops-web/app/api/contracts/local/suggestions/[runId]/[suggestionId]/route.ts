import { NextResponse } from "next/server";
import { isSurfaceOpsLocalWorkbenchEnabled } from "@/lib/auth-bypass";
import { reviewLocalWorkbenchSuggestion } from "@/lib/local-workbench/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ runId: string; suggestionId: string }> },
) {
  if (!isSurfaceOpsLocalWorkbenchEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Local suggestion review is only available in local development.",
      },
      { status: 403 },
    );
  }

  try {
    const payload = await request.json() as { decision?: string; rationale?: string };
    const { runId, suggestionId } = await context.params;
    const decision = payload.decision === "accepted" || payload.decision === "rejected"
      ? payload.decision
      : null;
    if (!decision) {
      return NextResponse.json(
        { ok: false, error: "decision must be accepted or rejected." },
        { status: 400 },
      );
    }
    await reviewLocalWorkbenchSuggestion({
      runId,
      suggestionId,
      decision,
      rationale: typeof payload.rationale === "string" ? payload.rationale : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
