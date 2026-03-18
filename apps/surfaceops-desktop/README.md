`surfaceops-desktop` is the Electron-based alpha shell for SurfaceOps.

It does not replace the current workbench implementation yet. Instead, it starts the existing
`surfaceops-web` local workbench on a managed localhost port and loads `/contracts/governance`
in a sandboxed renderer. In desktop runtime, SurfaceOps is intentionally a single-page shell:
no shared marketing navigation, no `/desktop` settings page, and no React updater controls.
Update actions stay in the native Electron menu.

## Commands

```bash
# From the repo root
pnpm dev:surfaceops:desktop

# Run the unsigned engineering rehearsal against a local staged feed
pnpm dev:surfaceops:desktop:unsigned-rehearsal
pnpm surfaceops:unsigned-rehearsal:stage -- --version 0.1.0-rc.1
pnpm surfaceops:unsigned-rehearsal:serve

# Or from this package
pnpm dev

# If pnpm skipped Electron's install script, repair it explicitly
pnpm setup:electron

# Build a bundled macOS release locally
pnpm dist:mac

# Build the CI-style macOS release payload without skipping signing/notarization hooks
pnpm dist:mac:ci
```

## Environment

- `SURFACEOPS_DESKTOP_PORT`: port used when the shell manages the local workbench server. Default: `3311`.
- `SURFACEOPS_DESKTOP_TARGET_URL`: optional existing SurfaceOps URL. If set, the Electron shell attaches to that URL instead of starting the local server.
- `SURFACEOPS_DESKTOP_WORKBENCH_PATH`: optional in-app path to load. Default: `/contracts/governance`.
- `SURFACEOPS_UPDATE_CHANNEL`: release channel for the in-app updater. Default: `alpha`.
- `SURFACEOPS_UPDATE_BASE_URL`: canonical updater base URL. Default: `https://surfaceops.ai/api/desktop/updates`.
- `SURFACEOPS_ENABLE_DEV_UPDATES`: optional `1` flag to enable updater checks in an unpackaged dev build.
- `SURFACEOPS_DESKTOP_RELEASE_MANIFEST_URL`: optional manifest override forwarded into the managed `surfaceops-web` process for rehearsal feeds.
- `SURFACEOPS_UNSIGNED_REHEARSAL_PORT`: optional local static-server port for unsigned rehearsal assets. Default: `4173`.
- `SURFACEOPS_UNSIGNED_REHEARSAL_DIR`: optional local staging directory for unsigned rehearsal assets. Default: `artifacts/surfaceops-desktop-unsigned-rehearsal`.

## Current alpha shape

- Single-page desktop shell rooted at `/contracts/governance`
- Shared `surfaceops.ai` marketing chrome suppressed in desktop runtime
- Workbench tabs (`controls`, `trace`, `chat`) are the only in-app navigation
- Update controls stay in the native menu (`Check for Updates`, channel switch, `Restart to Update`)
- Sandboxed Electron renderer
- Managed startup of the local SurfaceOps React workbench in dev and the bundled standalone server in packaged builds
- External links open in the system browser
- Background update checks on launch, focus, and interval with restart-to-install prompts
- Persisted in-app update channel selection (`alpha` default, `stable` optional)
- No managed model install yet

## Release rehearsal

SurfaceOps now has three distinct release-validation surfaces:

- `unsigned engineering rehearsal`: local unsigned DMG/ZIP artifacts, a local staged manifest, and dev-update validation only. Use `pnpm dev:surfaceops:desktop:unsigned-rehearsal` and the runbook at `docs/plans/surfaceops-desktop-unsigned-rehearsal.md`.
- `signed launch rehearsal`: GitHub rehearsal workflows, prerelease tags (`rehearsal-v0.1.0-rc.N`), and the clean Apple Silicon launch gate. Use `docs/plans/surfaceops-desktop-alpha-launch-rehearsal.md`.
- `public alpha release`: the real clean-semver publish path triggered by `vX.Y.Z`.

The unsigned rehearsal improves engineering confidence, but it does not satisfy the signed launch rehearsal or public release gate.
