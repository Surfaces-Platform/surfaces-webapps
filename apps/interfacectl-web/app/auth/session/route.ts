import { getSession } from "@surfaces/platform-auth";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const result = await getSession(request);
  return result.ok ? Response.json(result.session) : new Response(null, { status: 401 });
}
