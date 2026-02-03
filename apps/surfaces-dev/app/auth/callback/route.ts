import { handleCallback } from "@surfaces/platform-auth";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleCallback(request, { surface: process.env.PLATFORM_SURFACE_ID! });
}
