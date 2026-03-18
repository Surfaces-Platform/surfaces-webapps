import { parseArgs } from "./lib/surfaceops-desktop-feed.mjs";
import {
  resolveUnsignedRehearsalConfig,
  startUnsignedRehearsalStaticServer,
} from "./lib/surfaceops-desktop-unsigned-rehearsal.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const config = resolveUnsignedRehearsalConfig({
    repoRoot,
    env: {
      ...process.env,
      ...(args["root-dir"] ? { SURFACEOPS_UNSIGNED_REHEARSAL_DIR: args["root-dir"] } : {}),
      ...(args.host ? { SURFACEOPS_UNSIGNED_REHEARSAL_HOST: args.host } : {}),
      ...(args.port ? { SURFACEOPS_UNSIGNED_REHEARSAL_PORT: args.port } : {}),
      ...(args["base-url"] ? { SURFACEOPS_UNSIGNED_REHEARSAL_BASE_URL: args["base-url"] } : {}),
    },
  });
  const serverState = await startUnsignedRehearsalStaticServer({
    rootDir: config.stageDir,
    host: config.host,
    port: config.port,
  });

  console.log(
    `Serving unsigned SurfaceOps desktop rehearsal artifacts from ${serverState.rootDir} at ${serverState.baseUrl}`,
  );

  const shutdown = () => {
    if (!serverState.server) {
      process.exit(0);
      return;
    }

    serverState.server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
