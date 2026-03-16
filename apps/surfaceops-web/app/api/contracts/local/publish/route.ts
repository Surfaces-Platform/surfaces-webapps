import { NextResponse } from "next/server";
import { isSurfaceOpsLocalWorkbenchEnabled } from "@/lib/auth-bypass";
import { publishLocalWorkbenchContract } from "@/lib/local-workbench/service";

export async function POST() {
  if (!isSurfaceOpsLocalWorkbenchEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Local contract publish is only available in local development.",
      },
      { status: 403 },
    );
  }

  try {
    const publish = await publishLocalWorkbenchContract();
    return NextResponse.json({ ok: true, publish }, { status: 201 });
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
