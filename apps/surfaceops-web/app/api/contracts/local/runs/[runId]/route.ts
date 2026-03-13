import { NextResponse } from "next/server";
import { isSurfaceOpsLocalWorkbenchEnabled } from "@/lib/auth-bypass";
import { loadLocalWorkbenchRunDetail } from "@/lib/local-workbench/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  if (!isSurfaceOpsLocalWorkbenchEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Local run inspection is only available in local development.",
      },
      { status: 403 },
    );
  }

  const { runId } = await context.params;
  const detail = await loadLocalWorkbenchRunDetail(runId);
  if (!detail) {
    return NextResponse.json(
      {
        ok: false,
        error: `Run ${runId} not found.`,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, run: detail });
}
