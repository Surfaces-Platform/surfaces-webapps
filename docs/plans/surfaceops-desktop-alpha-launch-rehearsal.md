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

- `Stage A: VM smoke` runs in a fresh Apple Silicon macOS VM with no prior SurfaceOps install or updater cache. `Parallels` is the default path. `UTM` is an acceptable fallback when needed, but it is not the primary recommendation.
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
6. Start `Stage A: VM smoke` by provisioning a fresh Apple Silicon macOS VM from a clean image. Use `Parallels` by default, or `UTM` only when needed. Ensure there is no prior SurfaceOps install or updater cache, then save a baseline snapshot before testing.
7. Install the rehearsal `0.1.0-rc.1` DMG in the VM and confirm first launch succeeds.
8. Publish a second rehearsal release such as `0.1.0-rc.2`, then verify the installed `0.1.0-rc.1` VM client downloads and applies the newer rehearsal build through the in-app updater.
9. Exercise rehearsal promotion controls in the VM flow:
   - block the current alpha release
   - verify stable promotion returns a no-op
   - unblock or force-promote as needed
10. Run `surfaceops-desktop-stable-promotion-rehearsal.yml` with either a reduced `soak_hours` or `override_now` to simulate soak completion and verify stable promotion writes only to the rehearsal feed.
11. Start `Stage B: physical final signoff` on a separate physical Apple Silicon Mac with no prior SurfaceOps install. If a separate machine is unavailable, use a separate clean user profile and record that exception in the evidence for the run.
12. Install the latest rehearsal DMG on the physical Mac and confirm first launch succeeds, the updater resolves the expected channel and feed, and the restart-to-apply path succeeds if a newer rehearsal build exists.
13. Confirm production remains unchanged:
    - `surfaceops-desktop-feed` was not modified
    - `surfaceops.ai` production still resolves the production manifest URL
14. Record the run evidence:
    - the VM platform used
    - the rehearsal versions tested
    - whether physical signoff used a separate machine or a separate clean user profile
    - confirmation that production feed assets remained untouched
15. Do not cut the first real public `vX.Y.Z` tag until every step above is green and the run evidence is recorded.

## Rollback

- Preferred rollback: supersede the failed rehearsal with a newer `-rc.N` prerelease and rerun the rehearsal workflows.
- If a rehearsal build must be withdrawn, delete the affected GitHub prerelease tag and release, then republish the last known-good rehearsal release or regenerate the rehearsal feed from a newer rehearsal build.
- If the rehearsal feed itself is incorrect, replace the `surfaceops-desktop-feed-rehearsal` assets with the manifest, notes, and promotion-state from the last known-good rehearsal run.
- Production rollback is out of scope for this drill because production feed and Vercel configuration must remain untouched.
