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

console.log("edge tests passed");
