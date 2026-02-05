import { clearSessionAndRedirect } from "@surfaces/platform-auth";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Clears session cookie and redirects to /. Auth0 redirects here after logout
 * when using direct Auth0 v2 logout link.
 */
export async function GET(request: NextRequest) {
  return clearSessionAndRedirect(request, "/");
}
