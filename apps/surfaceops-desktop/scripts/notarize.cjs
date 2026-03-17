const path = require("node:path");
const { notarize } = require("@electron/notarize");

module.exports = async function notarizeSurfaceOpsDesktop(context) {
  if (process.env.SURFACEOPS_SKIP_NOTARIZE === "1") {
    return;
  }

  const { electronPlatformName, appOutDir, packager } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    throw new Error("Missing Apple notarization credentials.");
  }

  const appName = packager.appInfo.productFilename;
  await notarize({
    appBundleId: "ai.surfaceops.desktop",
    appPath: path.join(appOutDir, `${appName}.app`),
    appleId,
    appleIdPassword,
    teamId,
  });
};
