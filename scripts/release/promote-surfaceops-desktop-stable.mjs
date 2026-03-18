import {
  DEFAULT_SURFACEOPS_DESKTOP_SOAK_HOURS,
  createDefaultPromotionState,
  createEmptyDesktopReleaseManifest,
  loadJsonFile,
  parseArgs,
  promoteStableRelease,
  writeJsonFile,
} from "./lib/surfaceops-desktop-feed.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestFile = args["manifest-file"];
  const outManifest = args["out-manifest"];
  const outState = args["out-state"];
  const resultOut = args["result-out"];

  if (!manifestFile || !outManifest || !outState || !resultOut) {
    throw new Error("Missing required arguments: --manifest-file, --out-manifest, --out-state, and --result-out are required.");
  }

  const manifest = await loadJsonFile(manifestFile, () => createEmptyDesktopReleaseManifest());
  const promotionState = await loadJsonFile(
    args["promotion-state-file"],
    () => createDefaultPromotionState(),
  );
  const result = promoteStableRelease({
    manifest,
    promotionState,
    soakHours: args["soak-hours"] ?? DEFAULT_SURFACEOPS_DESKTOP_SOAK_HOURS,
    now: args.now ?? new Date(),
  });

  await writeJsonFile(outManifest, result.manifest);
  await writeJsonFile(outState, result.promotionState);

  if (args["notes-out"] && result.notesPayload) {
    await writeJsonFile(args["notes-out"], result.notesPayload);
  }

  await writeJsonFile(resultOut, {
    changed: result.changed,
    reason: result.reason,
    promotedReleaseId: result.promotedRelease?.id ?? null,
    promotedVersion: result.promotedRelease?.version ?? null,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
