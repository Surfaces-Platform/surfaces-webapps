# SurfaceOps Desktop Alpha Launch Dress Rehearsal

This runbook validates the real signed desktop release path before the first public `vX.Y.Z` alpha tag is cut.

If Apple signing credentials or a separate physical Apple Silicon Mac are unavailable, use `docs/plans/surfaceops-desktop-unsigned-rehearsal.md` for the engineering-only unsigned rehearsal instead. That path is not a substitute for this signed launch gate.

The release candidate being rehearsed is the single-page SurfaceOps desktop shell rooted at `/contracts/governance`. Update checks and channel switching live in the native menu; `/desktop` is not part of the desktop user flow.

## Rehearsal Surfaces

- Rehearsal release workflow: `.github/workflows/surfaceops-desktop-release-rehearsal.yml`
- Rehearsal stable-promotion workflow: `.github/workflows/surfaceops-desktop-stable-promotion-rehearsal.yml`
- Rehearsal promotion-control workflow: `.github/workflows/surfaceops-desktop-promotion-control-rehearsal.yml`
- Rehearsal feed release tag: `surfaceops-desktop-feed-rehearsal`
- Rehearsal manifest URL:
  `https://github.com/Surfaces-Platform/surfaces-webapps/releases/download/surfaceops-desktop-feed-rehearsal/surfaceops-desktop-release-manifest.json`

These rehearsal surfaces must never mutate the production feed release `surfaceops-desktop-feed`.

## Clean Apple Silicon Environment

For this runbook, a clean Apple Silicon environment means two required tiers:

- `Stage A: VM smoke` runs through the automated UTM + SSH flow. Keep a sealed base VM named `surfaceops-macos-stage-a-base` with a dedicated test user, Remote Login enabled, a fixed `LocalHostName`, a preloaded host SSH key, and no prior SurfaceOps install or updater cache. Each run clones that base VM to a disposable test clone.
- `Stage B: physical final signoff` runs on a separate physical Apple Silicon Mac with no prior SurfaceOps install. A separate clean user profile is acceptable only if a separate machine is unavailable.

The first public `vX.Y.Z` tag stays blocked until both tiers are green.

## Checklist

1. Confirm the Apple signing and notarization secrets used by production are present in GitHub Actions:
   `SURFACEOPS_DESKTOP_CSC_LINK`, `SURFACEOPS_DESKTOP_CSC_KEY_PASSWORD`, `SURFACEOPS_DESKTOP_APPLE_ID`, `SURFACEOPS_DESKTOP_APPLE_APP_SPECIFIC_PASSWORD`, and `SURFACEOPS_DESKTOP_APPLE_TEAM_ID`.
2. Run `surfaceops-desktop-release-rehearsal.yml` with a prerelease version such as `0.1.0-rc.1`.
3. Verify the GitHub prerelease `rehearsal-v0.1.0-rc.1` contains a DMG, ZIP, blockmaps, and the manifest/release-notes JSON assets.
4. Verify the feed release `surfaceops-desktop-feed-rehearsal` contains the rehearsal manifest, release-notes, and promotion-state assets.
5. Validate the hosted web surface locally against the rehearsal feed:
   `pnpm dev:surfaceops:rehearsal-feed`
   Then confirm `/download` and `/release-notes` reflect the rehearsal release instead of the checked-in fallback manifest.
6. Prepare or verify the sealed UTM base VM once:
   - name it `surfaceops-macos-stage-a-base`
   - enable Remote Login for the test user
   - set a stable local hostname such as `surfaceops-stage-a.local`
   - create and pre-authorize the dedicated host SSH key at `~/.ssh/surfaceops-stage-a`
   - ensure `~/Applications/SurfaceOps.app`, SurfaceOps preferences, and updater caches are absent
7. Run the automated Stage A smoke from the repo root:

   ```bash
   pnpm surfaceops:stage-a:utm -- --from 0.1.0-rc.1 --to 0.1.0-rc.2 --ssh-key ~/.ssh/surfaceops-stage-a
   ```

   The command clones the base VM, mirrors the signed rehearsal assets locally for the guest, installs `rc.1`, runs the managed-model first-run smoke, stages `rc.2` into the local mirror, exercises the updater, relaunches the updated app, collects evidence under `artifacts/surfaceops-desktop-stage-a/<run-id>/`, and deletes the clone.
8. Exercise rehearsal promotion controls after the updater pass:
   - block the current alpha release
   - verify stable promotion returns a no-op
   - unblock or force-promote as needed
9. Run `surfaceops-desktop-stable-promotion-rehearsal.yml` with either a reduced `soak_hours` or `override_now` to simulate soak completion and verify stable promotion writes only to the rehearsal feed.
10. Start `Stage B: physical final signoff` on a separate physical Apple Silicon Mac with no prior SurfaceOps install. If a separate machine is unavailable, use a separate clean user profile and record that exception in the evidence for the run.
11. Install the latest rehearsal DMG on the physical Mac and confirm first launch succeeds, the updater resolves the expected channel and feed, and the restart-to-apply path succeeds if a newer rehearsal build exists.
12. Confirm production remains unchanged:
    - `surfaceops-desktop-feed` was not modified
    - `surfaceops.ai` production still resolves the production manifest URL
13. Record the run evidence:
    - the VM platform used
    - the rehearsal versions tested
    - the Stage A evidence directory under `artifacts/surfaceops-desktop-stage-a/<run-id>/`
    - whether physical signoff used a separate machine or a separate clean user profile
    - confirmation that production feed assets remained untouched
14. Do not cut the first real public `vX.Y.Z` tag until every step above is green and the run evidence is recorded.

## Rollback

- Preferred rollback: supersede the failed rehearsal with a newer `-rc.N` prerelease and rerun the rehearsal workflows.
- If a rehearsal build must be withdrawn, delete the affected GitHub prerelease tag and release, then republish the last known-good rehearsal release or regenerate the rehearsal feed from a newer rehearsal build.
- If the rehearsal feed itself is incorrect, replace the `surfaceops-desktop-feed-rehearsal` assets with the manifest, notes, and promotion-state from the last known-good rehearsal run.
- Production rollback is out of scope for this drill because production feed and Vercel configuration must remain untouched.
