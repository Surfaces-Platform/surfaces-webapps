import {
  resolveSurfaceOpsStageAUtmConfig,
  runSurfaceOpsDesktopStageAUtm,
} from "./lib/surfaceops-desktop-stage-a-utm.mjs";

async function main() {
  const config = resolveSurfaceOpsStageAUtmConfig({
    repoRoot: process.cwd(),
    argv: process.argv.slice(2),
  });
  const summary = await runSurfaceOpsDesktopStageAUtm(config);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
