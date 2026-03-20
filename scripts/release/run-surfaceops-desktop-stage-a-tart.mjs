import {
  resolveSurfaceOpsStageATartConfig,
  runSurfaceOpsDesktopStageATart,
} from "./lib/surfaceops-desktop-stage-a-tart.mjs";

async function main() {
  const config = resolveSurfaceOpsStageATartConfig({
    repoRoot: process.cwd(),
    argv: process.argv.slice(2),
  });
  const summary = await runSurfaceOpsDesktopStageATart(config);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
