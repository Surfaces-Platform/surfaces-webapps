import {
  createDefaultPromotionState,
  loadJsonFile,
  parseArgs,
  updatePromotionState,
  writeJsonFile,
} from "./lib/surfaceops-desktop-feed.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const action = args.action;
  const out = args.out;

  if (!action || !out) {
    throw new Error("Missing required arguments: --action and --out are required.");
  }

  const currentState = await loadJsonFile(args["state-file"], () => createDefaultPromotionState());
  const nextState = updatePromotionState({
    promotionState: currentState,
    action,
    releaseId: args["release-id"] ?? null,
    reason: args.reason ?? null,
    now: args.now ?? new Date(),
  });

  await writeJsonFile(out, nextState);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
