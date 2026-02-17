import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore generated JSON manifest for edge validation
import manifestJson from "../../contracts/generated/reference-target-web.runtime-manifest.json" assert { type: "json" };

type Change = {
  surfaceId: string;
  sectionId?: string;
  proposedStyles?: { background?: string };
};

type Manifest = {
  contractId: string;
  version: string;
  surfaceId: string;
  color?: {
    policy?: "off" | "warn" | "strict";
    allowedValues?: string[];
  };
};

export const config = {
  matcher: ["/adaptive/:path*"],
};

const manifest = manifestJson as Manifest;

export function proxy(req: NextRequest) {
  const proposedBackground = req.headers.get("x-proposed-bg") || "";
  const sectionId = req.nextUrl.searchParams.get("section") || "";

  const result = validateEdgeChange({
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

function validateEdgeChange(change: Change) {
  if (!change || change.surfaceId !== manifest.surfaceId) {
    return {
      allowed: false,
      violations: [
        makeViolation("surface.mismatch", "strict", {
          surfaceId: change?.surfaceId,
        }),
      ],
    };
  }

  const violations = [];

  if (!change.sectionId) {
    violations.push(
      makeViolation("sections.required", "strict", {
        sectionId: change.sectionId,
      }),
    );
  }

  const proposedBackground = change.proposedStyles?.background ?? "";
  const colorPolicy = manifest.color;
  if (colorPolicy && colorPolicy.policy && colorPolicy.policy !== "off") {
    const allowedValues = new Set(colorPolicy.allowedValues ?? []);
    if (proposedBackground.length > 0 && !allowedValues.has(proposedBackground)) {
      violations.push(
        makeViolation("color.disallowed", colorPolicy.policy, {
          property: "background",
          value: proposedBackground,
          expected: [...allowedValues],
        }),
      );
    }
  }

  const blocking = violations.find((violation) => violation.policy === "strict");
  return {
    allowed: !blocking,
    violations,
    contract: {
      id: manifest.contractId,
      version: manifest.version,
      surfaceId: manifest.surfaceId,
    },
  };
}

function makeViolation(
  rule: string,
  policy: "strict" | "warn" | "off",
  evidence: unknown,
) {
  const effectivePolicy = policy === "off" ? "warn" : policy;
  return {
    rule,
    policy: effectivePolicy,
    severity: effectivePolicy === "strict" ? "error" : "warn",
    evidence,
  };
}
