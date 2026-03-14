`surfaceops-web` is the SurfaceOps application. In this branch, `/contracts/governance` is simplified into a local-only `reference-target-web` workbench that:

- runs without Auth0 in local development
- targets `reference-target-web` only
- uses a local LLM through an OpenAI-compatible API
- captures baseline/current previews from local sandbox apps
- shows contract summary, comparison metrics, suggestions, and a read-only chat explainer
- does not connect GitHub projects or publish PRs in this first cut

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
