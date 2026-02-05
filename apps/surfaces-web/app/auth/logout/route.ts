import { logout } from "@surfaces/platform-auth";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

function handleLogout(request: NextRequest) {
  return logout(request, {
    surface: process.env.PLATFORM_SURFACE_ID!,
    global: new URL(request.url).searchParams.get("global") === "1",
  });
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
