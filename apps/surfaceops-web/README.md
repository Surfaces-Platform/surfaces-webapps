`surfaceops-web` is the SurfaceOps public web surface and the source for the local workbench that the desktop alpha wraps. In this branch, `/contracts/governance` is simplified into a local-only `reference-target-web` workbench that:

- runs without Auth0 in local development
- targets `reference-target-web` only
- uses a local LLM through an OpenAI-compatible API
- captures baseline/current previews from local sandbox apps
- shows contract summary, comparison metrics, suggestions, and a read-only chat explainer
- does not connect GitHub projects or publish PRs in this first cut

Separate runtime evidence demos can drive both `reference-target-web` and `reference-flow-web` through canonical `interfacectl validate --remote-url` checks and SurfaceOps run artifacts. That demo path does not broaden the local editing loop: `/contracts/governance` still edits `reference-target-web` only in this phase.

In production, `surfaceops.ai` is now intended to stay marketing/download-only. Hosted `/contracts` routes redirect to `/download` unless local workbench mode is enabled.

Inside the Electron shell, SurfaceOps is a single-page desktop runtime rooted at `/contracts/governance`. The desktop app suppresses the shared marketing navigation, keeps only the in-page workbench tabs (`controls`, `trace`, `chat`), and exposes updater/channel controls through the native Electron menu instead of a React `/desktop` settings page.

## Getting Started

### Local workbench prerequisites

The local `/contracts/governance` route uses the reference target fixture and does not require Auth0, Postgres, GitHub tokens, or remote preview setup. Local development needs:

```bash
# The dedicated startup command injects these defaults automatically:
#   SURFACEOPS_LOCAL_WORKBENCH=1
#   SURFACEOPS_LOCAL_LLM_BASE_URL=http://127.0.0.1:1234/v1
#   SURFACEOPS_LOCAL_LLM_MODEL=openai/gpt-oss-120b
#
# Optional overrides still work if you export them before startup:

# Optional explicit local-workbench flag. In local development it is enabled automatically,
# but setting this keeps intent explicit.
SURFACEOPS_LOCAL_WORKBENCH=1

# Required local model config (OpenAI-compatible API).
SURFACEOPS_LOCAL_LLM_BASE_URL=http://127.0.0.1:1234/v1
SURFACEOPS_LOCAL_LLM_MODEL=openai/gpt-oss-120b

# Optional override for another LM Studio tool-capable model.
# SURFACEOPS_LOCAL_LLM_MODEL=qwen/qwen3-coder-30b

# Optional API key if your local server requires one.
SURFACEOPS_LOCAL_LLM_API_KEY=

# Optional local artifact root; defaults to repo-root/.scratch/surfaceops-local-runs.
SURFACEOPS_LOCAL_RUNS_DIR=/absolute/path/to/local-run-root

# Optional temp sandbox root; defaults to repo-root/.scratch/surfaceops-local-sandboxes.
SURFACEOPS_REPO_CLONE_ROOT=/absolute/path/to/local-sandbox-root

# Optional explicit interfacectl checkout when the resolver should prefer a specific local build.
SURFACES_INTERFACECTL_ROOT=/absolute/path/to/interfacectl
```

The local rerun flow shells through canonical `interfacectl` commands and a local tool-calling agent loop. The agent itself does not get arbitrary shell access; it only gets bounded file tools inside `apps/reference-target-web/**`.

### First local loop

1. Start LM Studio locally with the OpenAI-compatible server enabled on `http://127.0.0.1:1234/v1`.
   The workbench uses the OpenAI Responses API shape with function tools and defaults to `openai/gpt-oss-120b`.
   Leave LM Studio `Limit Response Length` disabled. If a preset still shows a numeric cap such as `1000`, keep it unchecked.
2. Start local `surfaceops-web`.
   ```bash
   pnpm dev:surfaceops:local-workbench
   ```
3. Open `/contracts/governance`.
4. Click `Run local LLM`.
5. Review:
   - `baseline` preview
   - `current` preview
   - comparison metrics
   - suggestion summaries
   - read-only chat explainer

Artifacts are written under `SURFACEOPS_LOCAL_RUNS_DIR` (or the default `.scratch` path).

### Run the dev server

From the repo root:

```bash
pnpm dev:surfaceops:local-workbench
```

Open [http://localhost:3001/contracts/governance](http://localhost:3001/contracts/governance).

### Runtime evidence demos

Use the runtime demo when you want a reusable operator-facing evidence loop rather than the local LLM editing flow.

Target-acquisition evidence:

```bash
pnpm dev:reference-target
pnpm dev:surfaceops
./scripts/demos/demo-runtime-surfaceops.sh
```

Flow evidence:

```bash
pnpm --filter reference-flow-web dev
pnpm dev:surfaceops
RUNTIME_DEMO_PROFILE=reference-flow ./scripts/demos/demo-runtime-surfaceops.sh
```

The runtime demo emits canonical runtime run artifacts into `contracts/generated`, validates them with `scripts/validate-run-artifacts.mjs`, and prints the matching SurfaceOps runs URL for the selected surface.

### Run the desktop alpha shell

From the repo root:

```bash
pnpm surfaceops:unsigned-rehearsal:stage -- --version 0.1.0-rc.1
pnpm surfaceops:unsigned-rehearsal:serve

pnpm dev:surfaceops:desktop

# Or validate the marketing/download surface against the rehearsal feed
pnpm dev:surfaceops:rehearsal-feed

# Or run the marketing/download surface against a local unsigned rehearsal feed
pnpm dev:surfaceops:unsigned-rehearsal-feed
```

This launches the Electron shell in `apps/surfaceops-desktop`, which starts the local workbench on a managed localhost port and loads `/contracts/governance` in a sandboxed renderer.
The desktop shell keeps runs/history inside the workbench trace area; `/desktop` and other marketing routes are compatibility redirects, not desktop destinations.

### Desktop updater feed

The canonical desktop update feed is served from `surfaceops.ai` using:

- `/api/desktop/updates/alpha/darwin-arm64/latest-mac.yml`
- `/api/desktop/updates/stable/darwin-arm64/latest-mac.yml`

The public download and release-notes pages read the same release manifest model as those update routes. In local development the app falls back to the checked-in manifest. In production it defaults to the stable GitHub feed manifest release asset and can still be overridden with `SURFACEOPS_DESKTOP_RELEASE_MANIFEST_URL`.

Public alpha releases publish automatically from clean semver tags, while stable promotion remains feed-only: the same signed alpha build moves to stable after a 72 hour soak unless an operator blocks it through the promotion-control workflow.

SurfaceOps now distinguishes three release phases:

- `unsigned engineering rehearsal`: local-only staged artifacts and manifest overrides, with no GitHub release publication and no launch-readiness claim. Use `pnpm surfaceops:unsigned-rehearsal:stage -- --version <version>`, optionally `pnpm surfaceops:unsigned-rehearsal:serve`, then `pnpm dev:surfaceops:unsigned-rehearsal-feed` and `docs/plans/surfaceops-desktop-unsigned-rehearsal.md`.
- `signed launch rehearsal`: the GitHub rehearsal workflows plus the clean Apple Silicon environment gate. Use `pnpm dev:surfaceops:rehearsal-feed` and `docs/plans/surfaceops-desktop-alpha-launch-rehearsal.md`.
- `public alpha release`: the actual `vX.Y.Z` path that updates the public download surface and production updater feed.

The signed launch rehearsal centers on a repeatable signed install/update smoke pass in a fresh Apple Silicon macOS VM using `Tart` on this Mac first. Optional physical-Mac or true guest-local inference signoff can remain a separate later gate before cutting the first public `vX.Y.Z` tag.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
