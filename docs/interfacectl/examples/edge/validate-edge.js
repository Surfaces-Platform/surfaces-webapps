import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "manifest.json"), "utf8"));

export function validateEdgeChange(change) {
  // change: { surfaceId, proposedStyles, sectionId }
  if (!change || change.surfaceId !== manifest.surfaceId) {
    return { allowed: false, violations: [makeViolation("surface.mismatch", "strict", { surfaceId: change?.surfaceId })] };
  }

  const violations = [];

  // Layout: require section id present
  if (!change.sectionId) {
    violations.push(makeViolation("sections.required", "strict", { sectionId: change.sectionId }));
  }

  // Color raw values
  if (manifest.color?.rawValues) {
    const policy = manifest.color.rawValues.policy;
    const value = change.proposedStyles?.background ?? "";
    const allowlist = new Set(manifest.color.rawValues.allowlist ?? []);
    const denylist = new Set(manifest.color.rawValues.denylist ?? []);
    if (isRawColorLiteral(value)) {
      if (denylist.has(value)) {
        violations.push(makeViolation("color.rawValues.denylist", policy, {
          property: "background",
          value,
        }));
      } else if (policy !== "off" && !allowlist.has(value)) {
        violations.push(makeViolation("color.rawValues", policy, {
          property: "background",
          value
        }));
      }
    }
  }

  if (manifest.color?.sourceOfTruth?.type === "tokens") {
    const value = change.proposedStyles?.background ?? "";
    const tokenNamespaces = manifest.color.sourceOfTruth.tokenNamespaces ?? [];
    const varName = extractCssVarName(value);
    if (varName && tokenNamespaces.length > 0) {
      const hasAllowedNamespace = tokenNamespaces.some((namespace) =>
        varName.startsWith(namespace),
      );
      if (!hasAllowedNamespace) {
        violations.push(makeViolation("color.token.namespace", "warn", {
          property: "background",
          value,
          tokenName: varName,
          tokenNamespaces,
        }));
      }
    }
  }

  const blocking = violations.find(v => v.policy === "strict");
  return {
    allowed: !blocking,
    violations,
    contract: { id: manifest.contractId, version: manifest.version, surfaceId: manifest.surfaceId }
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

function makeViolation(rule, policy, evidence) {
  const effectivePolicy = policy === "off" ? "warn" : policy;
  return { rule, policy: effectivePolicy, severity: effectivePolicy === "strict" ? "error" : "warn", evidence };
}

// Quick smoke test (run with `node docs/interfacectl/examples/edge/validate-edge.js`)
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateEdgeChange({
    surfaceId: "surfaces-web",
    sectionId: "hero",
    proposedStyles: { background: "rgba(15, 23, 42, 0.3)" }
  });
  console.log(JSON.stringify(result, null, 2));
}
