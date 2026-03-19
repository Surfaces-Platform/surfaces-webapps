const os = require("node:os");
const { execFileSync } = require("node:child_process");

const {
  selectRecommendedSurfaceOpsModel,
} = require("@surfaces/surfaceops-desktop-bridge");

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readSysctlValue(name) {
  try {
    return execFileSync("sysctl", ["-n", name], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function detectSurfaceOpsHardwareProfile(options = {}) {
  const env = options.env ?? process.env;
  const platform = env.SURFACEOPS_DESKTOP_TEST_PLATFORM?.trim() || (
    process.platform === "darwin" && process.arch === "arm64" ? "darwin-arm64" : "unsupported"
  );
  const unifiedMemoryGb = parsePositiveInteger(env.SURFACEOPS_DESKTOP_TEST_MEMORY_GB)
    ?? Math.max(1, Math.floor(os.totalmem() / (1024 ** 3)));
  const chip = env.SURFACEOPS_DESKTOP_TEST_CHIP?.trim()
    || readSysctlValue("machdep.cpu.brand_string")
    || os.cpus()?.[0]?.model
    || "Apple Silicon";
  const recommendedModel = selectRecommendedSurfaceOpsModel(unifiedMemoryGb);

  if (platform !== "darwin-arm64") {
    return {
      platform: "darwin-arm64",
      chip,
      unifiedMemoryGb,
      recommendedModelId: recommendedModel?.id ?? null,
      supported: false,
      reason: "SurfaceOps managed local inference currently supports Apple Silicon Macs only.",
      updatedAt: new Date().toISOString(),
    };
  }

  if (unifiedMemoryGb < 16) {
    return {
      platform: "darwin-arm64",
      chip,
      unifiedMemoryGb,
      recommendedModelId: recommendedModel?.id ?? null,
      supported: false,
      reason: "SurfaceOps requires at least 16 GB unified memory for managed local inference.",
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    platform: "darwin-arm64",
    chip,
    unifiedMemoryGb,
    recommendedModelId: recommendedModel?.id ?? null,
    supported: true,
    reason: null,
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  detectSurfaceOpsHardwareProfile,
};
