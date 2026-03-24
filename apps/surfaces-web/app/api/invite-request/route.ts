import { NextResponse } from "next/server";

const DEFAULT_LOCAL_SURFACEOPS_INVITE_REQUEST_URL = "http://localhost:3001/api/invite-request";
const DEFAULT_PRODUCTION_SURFACEOPS_INVITE_REQUEST_URL = "https://surfaceops.ai/api/invite-request";

function resolveInviteRequestUrl(): string {
  const explicitUrl = process.env.SURFACEOPS_INVITE_REQUEST_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  if (process.env.NODE_ENV === "development") {
    return DEFAULT_LOCAL_SURFACEOPS_INVITE_REQUEST_URL;
  }

  return DEFAULT_PRODUCTION_SURFACEOPS_INVITE_REQUEST_URL;
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  try {
    const upstreamResponse = await fetch(resolveInviteRequestUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const upstreamBody = (await upstreamResponse.json()) as { ok?: boolean; error?: string };
    return NextResponse.json(upstreamBody, { status: upstreamResponse.status });
  } catch (error) {
    console.error("invite-request proxy failed", error);

    return NextResponse.json(
      { ok: false, error: "Unable to save invite request." },
      { status: 500 },
    );
  }
}
