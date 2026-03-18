const path = require("node:path");
const {
  DEFAULT_UPDATE_BASE_URL,
  DEFAULT_UPDATE_CHANNEL,
} = require("@surfaces/surfaceops-desktop-bridge");

const updateBaseUrl = (process.env.SURFACEOPS_UPDATE_BASE_URL || DEFAULT_UPDATE_BASE_URL).replace(/\/+$/, "");
const updateChannel = process.env.SURFACEOPS_UPDATE_CHANNEL || DEFAULT_UPDATE_CHANNEL;
const releaseVersion = process.env.SURFACEOPS_DESKTOP_RELEASE_VERSION?.trim() || null;

module.exports = {
  appId: "ai.surfaceops.desktop",
  productName: "SurfaceOps",
  artifactName: "SurfaceOps-${version}-${arch}.${ext}",
  extraMetadata: releaseVersion ? { version: releaseVersion } : undefined,
  directories: {
    output: "dist",
    buildResources: "resources",
  },
  files: [
    "main.cjs",
    "preload.cjs",
    "lib/**/*",
    "package.json",
  ],
  extraResources: [
    {
      from: ".desktop-runtime/surfaceops-web",
      to: "surfaceops-web-runtime",
    },
  ],
  afterSign: "scripts/notarize.cjs",
  publish: [
    {
      provider: "generic",
      url: `${updateBaseUrl}/${updateChannel}/darwin-arm64`,
    },
  ],
  mac: {
    category: "public.app-category.developer-tools",
    hardenedRuntime: true,
    target: [
      { target: "dmg", arch: ["arm64"] },
      { target: "zip", arch: ["arm64"] },
    ],
  },
  dmg: {
    sign: false,
  },
};
