# GitHub Actions Workflow Setup

## Accessing Private interfacectl Repository

The workflows need to access the private `Surfaces-Platform/interfacectl` repository. There are two ways to configure this:

### Option 1: Organization Settings (Recommended)

If both repositories are in the same GitHub organization, configure the organization settings:

**Steps:**
1. Go to https://github.com/organizations/Surfaces-Platform/settings/actions
2. Navigate to **Actions** → **General** → **Workflow permissions**
3. Select **"Read and write permissions"** (or at minimum **"Read repository contents and packages permissions"**)
4. Check **"Allow GitHub Actions to create and approve pull requests"** (optional, but recommended)
5. Click **Save**

**Note:** This requires organization admin access. If you don't have admin access, use Option 2 (PAT) instead.

This allows `GITHUB_TOKEN` to access other repositories in the organization, including the private `interfacectl` repository.

### Option 2: Personal Access Token (PAT)

If organization settings don't allow cross-repo access, create a PAT:

1. Create a Personal Access Token (classic) with `repo` scope
2. Go to Repository Settings → Secrets and variables → Actions
3. Add a new secret named `INTERFACECTL_TOKEN` with the PAT value

The workflows will automatically use `INTERFACECTL_TOKEN` if available, otherwise fall back to `GITHUB_TOKEN`.

## Verifying Setup

After configuration, push a commit and check that the workflows can successfully checkout the `interfacectl` repository.
