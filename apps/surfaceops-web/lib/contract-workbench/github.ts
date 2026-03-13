import { spawn } from "node:child_process";
import path from "node:path";
import fsp from "node:fs/promises";

interface GithubRepoResponse {
  default_branch: string;
  html_url: string;
  clone_url: string;
  full_name: string;
}

interface GithubContentResponse {
  content: string;
  encoding: string;
  sha: string;
}

async function githubRequest<T>(
  token: string,
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`https://api.github.com${input}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${input} failed with ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

function runGit(args: string[], cwd: string, env?: NodeJS.ProcessEnv): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("git", args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error([`git ${args.join(" ")} failed with code ${code}.`, stderr.trim(), stdout.trim()].filter(Boolean).join("\n")));
        return;
      }
      resolve();
    });
  });
}

function remoteUrl(owner: string, repo: string, token: string): string {
  return `https://x-access-token:${encodeURIComponent(token)}@github.com/${owner}/${repo}.git`;
}

export interface GitHubRepoIdentity {
  owner: string;
  repo: string;
  defaultBranch: string;
  htmlUrl: string;
  cloneUrl: string;
}

export async function getGitHubRepoIdentity(
  owner: string,
  repo: string,
  token: string,
): Promise<GitHubRepoIdentity> {
  const response = await githubRequest<GithubRepoResponse>(token, `/repos/${owner}/${repo}`);
  return {
    owner,
    repo,
    defaultBranch: response.default_branch,
    htmlUrl: response.html_url,
    cloneUrl: response.clone_url,
  };
}

export async function getGitHubFileText(
  owner: string,
  repo: string,
  filePath: string,
  ref: string,
  token: string,
): Promise<string> {
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const response = await githubRequest<GithubContentResponse>(
    token,
    `/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
  );
  if (response.encoding !== "base64") {
    throw new Error(`Unsupported GitHub content encoding: ${response.encoding}.`);
  }
  return Buffer.from(response.content.replace(/\n/g, ""), "base64").toString("utf8");
}

export async function listGitHubRepos(token: string, owner?: string): Promise<string[]> {
  if (owner) {
    const repos = await githubRequest<Array<{ full_name: string }>>(
      token,
      `/orgs/${owner}/repos?per_page=100`,
    );
    return repos.map((item) => item.full_name).sort();
  }
  const repos = await githubRequest<Array<{ full_name: string }>>(
    token,
    "/user/repos?per_page=100&sort=updated",
  );
  return repos.map((item) => item.full_name).sort();
}

export async function cloneGitHubRepo(
  owner: string,
  repo: string,
  token: string,
  branch: string,
  targetDir: string,
): Promise<void> {
  await fsp.rm(targetDir, { recursive: true, force: true });
  await fsp.mkdir(path.dirname(targetDir), { recursive: true });
  await runGit(["clone", "--depth", "1", "--branch", branch, remoteUrl(owner, repo, token), targetDir], process.cwd());
}

export async function createBranchCommitAndPush(input: {
  repoDir: string;
  owner: string;
  repo: string;
  token: string;
  branchName: string;
  commitMessage: string;
}): Promise<string> {
  await runGit(["checkout", "-b", input.branchName], input.repoDir);
  await runGit(["config", "user.name", "SurfaceOps"], input.repoDir);
  await runGit(["config", "user.email", "surfaceops@surfaces.systems"], input.repoDir);
  await runGit(["add", "."], input.repoDir);
  await runGit(["commit", "-m", input.commitMessage], input.repoDir);
  await runGit(["push", "-u", remoteUrl(input.owner, input.repo, input.token), input.branchName], input.repoDir);

  const revParse = await new Promise<string>((resolve, reject) => {
    const child = spawn("git", ["rev-parse", "HEAD"], { cwd: input.repoDir, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `git rev-parse failed with ${code}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
  return revParse;
}

export async function createGitHubPullRequest(input: {
  owner: string;
  repo: string;
  token: string;
  title: string;
  body: string;
  head: string;
  base: string;
}): Promise<{ number: number; url: string }> {
  const response = await githubRequest<{ number: number; html_url: string }>(
    input.token,
    `/repos/${input.owner}/${input.repo}/pulls`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        head: input.head,
        base: input.base,
      }),
    },
  );
  return { number: response.number, url: response.html_url };
}
