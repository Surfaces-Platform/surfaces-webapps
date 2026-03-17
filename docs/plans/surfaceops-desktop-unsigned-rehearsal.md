# SurfaceOps Desktop Unsigned Engineering Rehearsal

This runbook validates local packaging, manifest generation, updater wiring, and promotion-state behavior without Apple signing credentials or a separate physical Apple Silicon Mac.

It is an engineering-confidence drill only. It must not be used as evidence that SurfaceOps is ready for the first public `vX.Y.Z` alpha tag.

The target app shape for this rehearsal is the single-page SurfaceOps desktop shell rooted at `/contracts/governance`. Update controls remain in the native menu; there is no React desktop settings surface in the desktop flow.

## What This Runbook Covers

- local unsigned `dist:mac` packaging
- local HTTP staging of desktop artifacts, manifest, release notes, and promotion state
- local `surfaceops-web` validation against the staged manifest
- local desktop updater validation in dev-update mode
- local block, unblock, force-promote, and soak-simulation checks against staged files

For the signed prerelease drill and the clean Apple Silicon final gate, use `docs/plans/surfaceops-desktop-alpha-launch-rehearsal.md` instead.

## Commands

1. Build the first unsigned rehearsal payload:

   ```bash
   SURFACEOPS_DESKTOP_RELEASE_VERSION=0.1.0-rc.1 pnpm --filter surfaceops-desktop dist:mac
   ```

2. Stage it into the local unsigned rehearsal feed:

   ```bash
   pnpm surfaceops:unsigned-rehearsal:stage -- --version 0.1.0-rc.1
   ```

3. Optionally host the staged feed explicitly for manual inspection:

   ```bash
   pnpm surfaceops:unsigned-rehearsal:serve
   ```

4. Run the web surface against the staged manifest:

   ```bash
   pnpm dev:surfaceops:unsigned-rehearsal-feed
   ```

   This command also starts or reuses the local unsigned rehearsal static server automatically.

5. Run the desktop shell against the same staged manifest with dev updates enabled:

   ```bash
   pnpm dev:surfaceops:desktop:unsigned-rehearsal
   ```

   This command also starts or reuses the local unsigned rehearsal static server automatically.

6. Build and stage a second payload:

   ```bash
   SURFACEOPS_DESKTOP_RELEASE_VERSION=0.1.0-rc.2 pnpm --filter surfaceops-desktop dist:mac
   pnpm surfaceops:unsigned-rehearsal:stage -- --version 0.1.0-rc.2
   ```

7. Exercise promotion-state logic against the staged files:

   ```bash
   node scripts/release/update-surfaceops-desktop-promotion-state.mjs \
     --action block \
     --release-id desktop-alpha-0.1.0-rc.2 \
     --reason "Unsigned rehearsal incident drill." \
     --state-file artifacts/surfaceops-desktop-unsigned-rehearsal/surfaceops-desktop-promotion-state.json \
     --out artifacts/surfaceops-desktop-unsigned-rehearsal/surfaceops-desktop-promotion-state.json

   node scripts/release/promote-surfaceops-desktop-stable.mjs \
     --manifest-file artifacts/surfaceops-desktop-unsigned-rehearsal/surfaceops-desktop-release-manifest.json \
     --promotion-state-file artifacts/surfaceops-desktop-unsigned-rehearsal/surfaceops-desktop-promotion-state.json \
     --soak-hours 72 \
     --out-manifest artifacts/surfaceops-desktop-unsigned-rehearsal/surfaceops-desktop-release-manifest.json \
     --out-state artifacts/surfaceops-desktop-unsigned-rehearsal/surfaceops-desktop-promotion-state.json \
     --notes-out artifacts/surfaceops-desktop-unsigned-rehearsal/surfaceops-desktop-release-notes.json \
     --result-out artifacts/surfaceops-desktop-unsigned-rehearsal/result.json
   ```

## Optional Packaged-App Updater Drill

If Gatekeeper friction is acceptable, install the unsigned DMG and launch the app from Terminal with the local feed overrides:

```bash
SURFACEOPS_ENABLE_DEV_UPDATES=1 \
SURFACEOPS_UPDATE_CHANNEL=alpha \
SURFACEOPS_UPDATE_BASE_URL=http://127.0.0.1:3311/api/desktop/updates \
SURFACEOPS_DESKTOP_RELEASE_MANIFEST_URL=http://127.0.0.1:4173/surfaceops-desktop-release-manifest.json \
"/Applications/SurfaceOps.app/Contents/MacOS/SurfaceOps"
```

That verifies the packaged unsigned app against the local staged feed. It still does not replace the signed launch rehearsal or the separate physical Apple Silicon signoff gate.

## Acceptance Criteria

- `pnpm --filter surfaceops-desktop dist:mac` succeeds for `rc.1` and `rc.2`
- the local staged manifest, notes, and promotion-state files are generated under `artifacts/surfaceops-desktop-unsigned-rehearsal`
- `/download` and `/release-notes` reflect the staged unsigned release when the unsigned feed dev command is running
- the desktop app reaches the updater UI against the local feed and detects `rc.2` after the second stage step
- local promotion-state commands mutate only the staged unsigned rehearsal files
- no GitHub release assets, rehearsal feed assets, or production `surfaceops.ai` configuration are touched

## Explicit Limits

- No Apple signing
- No notarization
- No GitHub prerelease publication
- No `surfaceops-desktop-feed-rehearsal` mutations
- No physical Apple Silicon final signoff
- No public `vX.Y.Z` release decision based on this runbook alone
