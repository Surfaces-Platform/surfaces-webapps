import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore generated JSON manifest for edge validation
import manifestJson from "../../contracts/generated/surfaces-web.runtime-manifest.json" assert { type: "json" };

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
  color?: {
    sourceOfTruth?: { type: "tokens" | "none"; tokenNamespaces?: string[] };
    rawValues?: {
      policy: "off" | "warn" | "strict";
      allowlist?: string[];
      denylist?: string[];
    };
  };
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

  // Require section identifier
  if (!change.sectionId) {
    violations.push(
      makeViolation("sections.required", "strict", {
        sectionId: change.sectionId,
      })
    );
  }

  // Color raw values (hex/rgb/hsl)
  if (manifest.color?.rawValues) {
    const policy = manifest.color.rawValues.policy;
    const value = change.proposedStyles?.background ?? "";
    const allowlist = new Set(manifest.color.rawValues.allowlist ?? []);
    const denylist = new Set(manifest.color.rawValues.denylist ?? []);

    if (isRawColorLiteral(value)) {
      if (denylist.has(value)) {
        violations.push(
          makeViolation("color.rawValues.denylist", policy, {
            property: "background",
            value,
            denylist: [...denylist],
          })
        );
      } else if (policy !== "off" && !allowlist.has(value)) {
        violations.push(
          makeViolation("color.rawValues", policy, {
            property: "background",
            value,
            allowlist: [...allowlist],
          })
        );
      }
    }
  }

  // Color token namespace warnings
  if (manifest.color?.sourceOfTruth?.type === "tokens") {
    const value = change.proposedStyles?.background ?? "";
    const tokenNamespaces = manifest.color.sourceOfTruth.tokenNamespaces ?? [];
    const varName = extractCssVarName(value);
    if (varName && tokenNamespaces.length > 0) {
      const hasAllowedNamespace = tokenNamespaces.some((namespace) =>
        varName.startsWith(namespace),
      );
      if (!hasAllowedNamespace) {
        violations.push(
          makeViolation("color.token.namespace", "warn", {
            property: "background",
            value,
            tokenName: varName,
            tokenNamespaces,
          })
        );
      }
    }
  }

  const blocking = violations.find((v) => v.policy === "strict");
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

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
function isRawColorLiteral(value = "") {
  const normalized = value.trim().toLowerCase();
  if (HEX_COLOR_REGEX.test(normalized)) return true;
  if (/^rgba?\s*\(/.test(normalized)) return true;
  if (/^hsla?\s*\(/.test(normalized)) return true;
  return false;
}

function extractCssVarName(value = "") {
  const match = value.match(/var\((--[^)]+)\)/);
  return match ? match[1] : null;
}

function makeViolation(
  rule: string,
  policy: "strict" | "warn" | "off",
  evidence: unknown
) {
  const effectivePolicy = policy === "off" ? "warn" : policy;
  return {
    rule,
    policy: effectivePolicy,
    severity: effectivePolicy === "strict" ? "error" : "warn",
    evidence,
  };
}
