import { NextResponse } from "next/server";
import { isSurfaceOpsLocalWorkbenchEnabled } from "@/lib/auth-bypass";
import { appendLocalWorkbenchChatMessage } from "@/lib/local-workbench/service";

export async function POST(request: Request) {
  if (!isSurfaceOpsLocalWorkbenchEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Local contract chat is only available in local development.",
      },
      { status: 403 },
    );
  }

  try {
    const payload = await request.json() as { message?: string };
    const message = typeof payload.message === "string" ? payload.message.trim() : "";
    if (!message) {
      return NextResponse.json(
        { ok: false, error: "message must be a non-empty string." },
        { status: 400 },
      );
    }

    await appendLocalWorkbenchChatMessage({ message });
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
