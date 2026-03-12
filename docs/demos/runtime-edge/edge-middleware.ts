// @ts-nocheck
// Example Next.js Edge Middleware usage (conceptual wiring).
// Drop into /middleware.ts in a Next.js app configured for edge runtime.
import { NextRequest, NextResponse } from "next/server";
import { validateEdgeChange } from "./validate-edge.js";

export const config = {
  matcher: ["/adaptive/:path*"],
};

export function middleware(req: NextRequest) {
  // Example: read proposed background from query or header in an adaptive flow
  const proposedBackground = req.headers.get("x-proposed-bg") || "";
  const sectionId = req.nextUrl.searchParams.get("section") || "unknown";

  const result = validateEdgeChange({
    surfaceId: "surfaces-web",
    sectionId,
    proposedStyles: { background: proposedBackground },
  });

  if (!result.allowed) {
    // Block or rewrite response
    return NextResponse.json(
      { error: "Contract violation", violations: result.violations },
      { status: 422 }
    );
  }

  // Allow request through
  return NextResponse.next();
}
