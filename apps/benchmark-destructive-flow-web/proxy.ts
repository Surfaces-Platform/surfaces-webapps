import { NextRequest, NextResponse } from "next/server";
import { validateRuntimeChange, type PreparedRuntimeManifest } from "../_shared/runtime-governance";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore generated JSON manifest for edge validation
import manifestJson from "../../contracts/generated/reference-target-web.runtime-manifest.json" assert { type: "json" };

export const config = {
  matcher: ["/adaptive/:path*"],
};

const manifest = manifestJson as PreparedRuntimeManifest;

export function proxy(req: NextRequest) {
  const proposedBackground = req.headers.get("x-proposed-bg") || "";
  const sectionId = req.nextUrl.searchParams.get("section") || "";

  const result = validateRuntimeChange(manifest, {
    surfaceId: "reference-target-web",
    sectionId,
    proposedStyles: { background: proposedBackground },
  });

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Contract violation", violations: result.violations },
      { status: 422 },
    );
  }

  return NextResponse.next();
}
