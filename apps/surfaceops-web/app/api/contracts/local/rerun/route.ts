import { NextResponse } from "next/server";
import { isSurfaceOpsLocalWorkbenchEnabled } from "@/lib/auth-bypass";
import { startLocalWorkbenchRerun } from "@/lib/local-workbench/service";

export async function POST() {
  if (!isSurfaceOpsLocalWorkbenchEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Local workbench reruns are only available in local development.",
      },
      { status: 403 },
    );
  }

  try {
    const run = await startLocalWorkbenchRerun();
    return NextResponse.json({ ok: true, run }, { status: 202 });
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
