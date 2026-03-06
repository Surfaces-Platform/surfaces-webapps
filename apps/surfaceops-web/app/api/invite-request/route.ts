import { NextResponse } from "next/server";
import {
  createInviteRequest,
  parseInviteRequestPayload,
  type InviteRequestPayload,
} from "@/lib/invite-requests";

export async function POST(request: Request) {
  let payload: InviteRequestPayload;

  try {
    payload = (await request.json()) as InviteRequestPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  try {
    const record = parseInviteRequestPayload(payload);
    await createInviteRequest(record);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && /email|payload/i.test(error.message)) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Unable to save invite request." },
      { status: 500 },
    );
  }
}
