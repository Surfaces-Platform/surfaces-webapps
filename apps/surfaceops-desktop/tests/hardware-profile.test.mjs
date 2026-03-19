import test from "node:test";
import assert from "node:assert/strict";

import { detectSurfaceOpsHardwareProfile } from "../lib/hardware-profile.cjs";

test("hardware profile recommends starter for 16 GB Apple Silicon", () => {
  const profile = detectSurfaceOpsHardwareProfile({
    env: {
      SURFACEOPS_DESKTOP_TEST_PLATFORM: "darwin-arm64",
      SURFACEOPS_DESKTOP_TEST_MEMORY_GB: "16",
      SURFACEOPS_DESKTOP_TEST_CHIP: "Apple M1",
    },
  });

  assert.equal(profile.supported, true);
  assert.equal(profile.recommendedModelId, "starter");
});

test("hardware profile recommends balanced for 24 GB Apple Silicon", () => {
  const profile = detectSurfaceOpsHardwareProfile({
    env: {
      SURFACEOPS_DESKTOP_TEST_PLATFORM: "darwin-arm64",
      SURFACEOPS_DESKTOP_TEST_MEMORY_GB: "24",
      SURFACEOPS_DESKTOP_TEST_CHIP: "Apple M2 Pro",
    },
  });

  assert.equal(profile.supported, true);
  assert.equal(profile.recommendedModelId, "balanced");
});

test("hardware profile recommends quality for 36 GB Apple Silicon", () => {
  const profile = detectSurfaceOpsHardwareProfile({
    env: {
      SURFACEOPS_DESKTOP_TEST_PLATFORM: "darwin-arm64",
      SURFACEOPS_DESKTOP_TEST_MEMORY_GB: "36",
      SURFACEOPS_DESKTOP_TEST_CHIP: "Apple M3 Max",
    },
  });

  assert.equal(profile.supported, true);
  assert.equal(profile.recommendedModelId, "quality");
});

test("hardware profile rejects unsupported machines", () => {
  const profile = detectSurfaceOpsHardwareProfile({
    env: {
      SURFACEOPS_DESKTOP_TEST_PLATFORM: "linux-x64",
      SURFACEOPS_DESKTOP_TEST_MEMORY_GB: "32",
      SURFACEOPS_DESKTOP_TEST_CHIP: "Intel",
    },
  });

  assert.equal(profile.supported, false);
  assert.match(profile.reason ?? "", /Apple Silicon Macs only/);
});
