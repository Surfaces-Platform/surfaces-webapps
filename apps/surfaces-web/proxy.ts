import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore bundled JSON manifest for edge validation
import manifestJson from "../../docs/interfacectl/examples/edge/manifest.json" assert { type: "json" };

type Change = {
  surfaceId: string;
  sectionId?: string;
  proposedStyles?: { background?: string };
};

export const config = {
  matcher: ["/adaptive/:path*"],
};

type Manifest = {
  contractId: string;
  version: string;
  surfaceId: string;
  layout: { maxContentWidth?: number };
  motion?: { allowedDurationsMs?: number[]; allowedTimingFunctions?: string[] };
  color?: { rawValues?: { policy: "off" | "warn" | "strict" } };
};

const manifest = manifestJson as Manifest;

export function proxy(req: NextRequest) {
  const proposedBackground = req.headers.get("x-proposed-bg") || "";
  const sectionId = req.nextUrl.searchParams.get("section") || "";

  const result = validateEdgeChange({
    surfaceId: "surfaces-web",
    sectionId,
    proposedStyles: { background: proposedBackground },
  });

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Contract violation", violations: result.violations },
      { status: 422 }
    );
  }

  return NextResponse.next();
}

function validateEdgeChange(change: Change) {
  if (!change || change.surfaceId !== manifest.surfaceId) {
    return { allowed: false, violations: [makeViolation("surface.mismatch", "strict", { surfaceId: change?.surfaceId })] };
  }

  const violations = [];

  // Require section identifier
  if (!change.sectionId) {
    violations.push(makeViolation("sections.required", "strict", { sectionId: change.sectionId }));
  }

  // Color raw values (only if present in manifest)
  if (manifest.color?.rawValues) {
    const policy = manifest.color.rawValues.policy;
    if (policy !== "off" && hasRawColor(change.proposedStyles?.background)) {
      violations.push(makeViolation("color.rawValues", policy, {
        property: "background",
        value: change.proposedStyles?.background
      }));
    }
  }

  const blocking = violations.find((v) => v.policy === "strict");
  return {
    allowed: !blocking,
    violations,
    contract: { id: manifest.contractId, version: manifest.version, surfaceId: manifest.surfaceId },
  };
}

const RAW_COLOR_REGEX = /(rgb|hsl)a?\(/i;
function hasRawColor(value = "") { return RAW_COLOR_REGEX.test(value); }
function makeViolation(rule: string, policy: "strict" | "warn", evidence: unknown) {
  return { rule, policy, severity: policy === "strict" ? "error" : "warn", evidence };
}
