---
name: monitor-gh-vercel
description: Monitor GitHub Actions and Vercel deployments during commits, pushes, and redeploys. Use when the user is committing, pushing, or deploying and wants to watch CI/CD and deployment status.
---

# Monitor GitHub and Vercel During Commits/Redeploys

## When to Use

- User is committing or pushing changes
- User asks to "monitor" or "watch" during deploy
- User wants status of GitHub Actions or Vercel after a push

## Quick Start

From `surfaces-webapps` (or `interfacectl` for GH only):

```bash
# One-shot status check
pnpm run monitor:commit-redeploy

# Background polling (every 60s until Ctrl+C)
pnpm run monitor:commit-redeploy --watch
```

## What It Monitors

1. **GitHub**
   - `gh run list` – recent workflow runs
   - `gh pr status` – current branch PR and checks (if on a PR branch)

2. **Vercel**
   - Production URLs from `contracts/surfaces.web.contract.json`
   - `vercel inspect <url>` – deployment status, target, created time
   - Adaptive route probe (`/adaptive/test?section=hero`)

## Repo Context

- **surfaces-webapps**: Has both GH and Vercel; primary deploy target.
- **interfacectl**: GH only (no Vercel in this repo). Run `gh run list` from repo root.

## Output

- GitHub: workflow name, status (queued/in_progress/completed), conclusion, branch.
- Vercel: surface name, status (Ready/Building/Error), target, deployment ID, adaptive probe HTTP code.

## Subagent Behavior

When the user asks to "monitor during commits" or "watch the deploy":

1. Start the monitor script in background: `pnpm run monitor:commit-redeploy --watch`
2. Proceed with the commit/push workflow
3. Report GH and Vercel status when user asks or when failures appear
