# GitHub Actions Workflow Setup

## Accessing Private interfacectl Repository

The workflows need to access the private `Surfaces-Platform/interfacectl` repository. **GITHUB_TOKEN cannot access other private repositories**, even in the same organization, so a Personal Access Token (PAT) is required.

### Setup: Personal Access Token (Required)

**Steps:**
1. Create a Personal Access Token (classic):
   - Go to https://github.com/settings/tokens
   - Click **"Generate new token"** → **"Generate new token (classic)"**
   - Name it: `interfacectl-workflow-access`
   - Select scope: **`repo`** (full control of private repositories)
   - Click **"Generate token"**
   - **Copy the token immediately** (you won't be able to see it again)

2. Add the token as a repository secret:
   - Go to https://github.com/Surfaces-Platform/surfaces-webapps/settings/secrets/actions
   - Click **"New repository secret"**
   - Name: `INTERFACECTL_TOKEN`
   - Value: Paste the PAT you copied
   - Click **"Add secret"**

The workflows will automatically use `INTERFACECTL_TOKEN` to checkout the private `interfacectl` repository.

**Note:** The token needs `repo` scope to access private repositories. Make sure the token has access to the `Surfaces-Platform/interfacectl` repository.

## Verifying Setup

After configuration, push a commit and check that the workflows can successfully checkout the `interfacectl` repository.
