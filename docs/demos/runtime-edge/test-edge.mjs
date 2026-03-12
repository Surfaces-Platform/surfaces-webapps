import { validateEdgeChange } from "./validate-edge.js";

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

const missingSection = validateEdgeChange({
  surfaceId: "surfaces-web",
  sectionId: "",
  proposedStyles: { background: "rgba(15, 23, 42, 0.3)" },
});
assert(!missingSection.allowed, "missing section should block");

const ok = validateEdgeChange({
  surfaceId: "surfaces-web",
  sectionId: "hero",
  proposedStyles: { background: "var(--background)" },
});
assert(ok.allowed, "valid change should be allowed");
assert(ok.contract?.id, "contract id should be present");
assert(ok.contract?.version, "contract version should be present");
assert(ok.contract?.surfaceId === "surfaces-web", "contract surfaceId should match");

const mismatch = validateEdgeChange({
  surfaceId: "unexpected-surface",
  sectionId: "hero",
  proposedStyles: { background: "var(--background)" },
});
assert(!mismatch.allowed, "surface mismatch should block");
assert(mismatch.violations?.[0]?.rule === "surface.mismatch", "surface mismatch should emit rule");

console.log("edge tests passed");
