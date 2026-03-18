import { parseArgs } from "./lib/surfaceops-desktop-feed.mjs";
import {
  buildUnsignedRehearsalManifestUrl,
  stageUnsignedRehearsal,
} from "./lib/surfaceops-desktop-unsigned-rehearsal.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.version) {
    throw new Error("Missing required argument: --version");
  }

  const result = await stageUnsignedRehearsal({
    version: args.version,
    channel: args.channel ?? "alpha",
    distDir: args["dist-dir"],
    outDir: args["out-dir"],
    baseUrl: args["base-url"],
    publishedAt: args["published-at"] ?? new Date().toISOString(),
  });

  console.log(JSON.stringify({
    version: result.release.version,
    releaseId: result.release.id,
    manifestPath: result.manifestPath,
    manifestUrl: buildUnsignedRehearsalManifestUrl(result.baseUrl),
    notesPath: result.notesPath,
    promotionStatePath: result.promotionStatePath,
    releaseDir: result.releaseDir,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
