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

## Stage A Scope

For this runbook, `Stage A` is a signed install/update smoke gate in a disposable Apple Silicon macOS VM. It validates DMG install, first launch, onboarding reachability, governance entry, updater `rc.1 -> rc.2`, and evidence capture.

`Stage A` does not certify true guest-local inference performance. The smoke path uses a host-backed deterministic runtime plus model-download fixtures so the gate stays focused on install and update behavior.

If you still want physical-Mac or true local-inference signoff, treat that as a separate later gate outside this runbook.

## Checklist

1. Confirm the Apple signing and notarization secrets used by production are present in GitHub Actions:
   `SURFACEOPS_DESKTOP_CSC_LINK`, `SURFACEOPS_DESKTOP_CSC_KEY_PASSWORD`, `SURFACEOPS_DESKTOP_APPLE_ID`, `SURFACEOPS_DESKTOP_APPLE_APP_SPECIFIC_PASSWORD`, and `SURFACEOPS_DESKTOP_APPLE_TEAM_ID`.
2. Run `surfaceops-desktop-release-rehearsal.yml` with a prerelease version such as `0.1.0-rc.1`.
3. Verify the GitHub prerelease `rehearsal-v0.1.0-rc.1` contains a DMG, ZIP, blockmaps, and the manifest/release-notes JSON assets.
4. Verify the feed release `surfaceops-desktop-feed-rehearsal` contains the rehearsal manifest, release-notes, and promotion-state assets.
5. Validate the hosted web surface locally against the rehearsal feed:
   `pnpm dev:surfaceops:rehearsal-feed`
   Then confirm `/download` and `/release-notes` reflect the rehearsal release instead of the checked-in fallback manifest.
6. Prepare or verify the sealed Tart base VM once:
   - install Tart locally
   - create `surfaceops-stage-a-base` from `/Users/mike/Downloads/UniversalMac_26.3.1_25D2128_Restore.ipsw`
   - set the image defaults to `4 vCPU`, `8 GB RAM`, and `1920x1200`
   - boot the VM once and complete the normal macOS install
   - create a local user `surfaceops`
   - enable Remote Login, set the hostname to `surfaceops-stage-a.local`, and pre-authorize `~/.ssh/surfaceops-stage-a.pub`
   - ensure `~/Applications/SurfaceOps.app`, SurfaceOps preferences, and updater caches are absent before sealing the image
7. Run the automated Stage A smoke from the repo root:

   ```bash
   pnpm surfaceops:stage-a:tart -- --from 0.1.0-rc.1 --to 0.1.0-rc.2 --ssh-key ~/.ssh/surfaceops-stage-a
   ```

   The command clones the Tart base VM, mirrors the signed rehearsal assets locally for the guest, installs `rc.1`, runs the bounded first-run smoke against the host-backed deterministic runtime, stages `rc.2` into the local mirror, exercises the updater, relaunches the updated app, collects evidence under `artifacts/surfaceops-desktop-stage-a/<run-id>/`, and deletes the clone.
8. Exercise rehearsal promotion controls after the updater pass:
   - block the current alpha release
   - verify stable promotion returns a no-op
   - unblock or force-promote as needed
9. Run `surfaceops-desktop-stable-promotion-rehearsal.yml` with either a reduced `soak_hours` or `override_now` to simulate soak completion and verify stable promotion writes only to the rehearsal feed.
10. Confirm production remains unchanged:
    - `surfaceops-desktop-feed` was not modified
    - `surfaceops.ai` production still resolves the production manifest URL
11. Record the run evidence:
    - the VM platform used (`Tart`)
    - the rehearsal versions tested
    - the Stage A evidence directory under `artifacts/surfaceops-desktop-stage-a/<run-id>/`
    - confirmation that the bounded runtime path used host-backed deterministic services rather than true guest-local inference
    - confirmation that production feed assets remained untouched
12. Do not cut the first real public `vX.Y.Z` tag until every step above is green and any separately-chosen final signoff gates are recorded.

## Rollback

- Preferred rollback: supersede the failed rehearsal with a newer `-rc.N` prerelease and rerun the rehearsal workflows.
- If a rehearsal build must be withdrawn, delete the affected GitHub prerelease tag and release, then republish the last known-good rehearsal release or regenerate the rehearsal feed from a newer rehearsal build.
- If the rehearsal feed itself is incorrect, replace the `surfaceops-desktop-feed-rehearsal` assets with the manifest, notes, and promotion-state from the last known-good rehearsal run.
- Production rollback is out of scope for this drill because production feed and Vercel configuration must remain untouched.
