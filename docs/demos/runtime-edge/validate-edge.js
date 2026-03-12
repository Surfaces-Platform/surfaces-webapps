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

  // Unified color policy (exact allowlist).
  if (manifest.color) {
    const policy = manifest.color.policy ?? "off";
    const value = change.proposedStyles?.background ?? "";
    const allowlist = new Set(manifest.color.allowedValues ?? []);
    if (policy !== "off" && isRawColorLiteral(value) && !allowlist.has(value)) {
      violations.push(makeViolation("color.disallowed", policy, {
        property: "background",
        value
      }));
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

function makeViolation(rule, policy, evidence) {
  const effectivePolicy = policy === "off" ? "warn" : policy;
  return { rule, policy: effectivePolicy, severity: effectivePolicy === "strict" ? "error" : "warn", evidence };
}

// Quick smoke test (run with `node docs/demos/runtime-edge/validate-edge.js`)
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateEdgeChange({
    surfaceId: "surfaces-web",
    sectionId: "hero",
    proposedStyles: { background: "rgba(15, 23, 42, 0.3)" }
  });
  console.log(JSON.stringify(result, null, 2));
}
