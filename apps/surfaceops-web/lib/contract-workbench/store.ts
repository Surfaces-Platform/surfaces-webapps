import { createHash, randomUUID } from "node:crypto";
import { getPool } from "@/lib/db";
import { decryptJson, encryptJson } from "./crypto";
import type {
  ContractProjectAuthSession,
  ContractProjectDraft,
  ContractProjectInput,
  ContractProjectPublishRecord,
  ContractProjectRecord,
  ContractProjectRunRecord,
  ContractProjectRunStatus,
  PublishStatus,
} from "./types";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stringifyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function parseProjectRow(row: Record<string, unknown>): ContractProjectRecord {
  return {
    workspaceId: String(row.workspace_id),
    projectId: String(row.project_id),
    name: String(row.name),
    githubOwner: String(row.github_owner),
    githubRepo: String(row.github_repo),
    githubDefaultBranch: String(row.github_default_branch),
    contractPath: String(row.contract_path),
    surfaces: (row.surfaces_json as ContractProjectRecord["surfaces"]) ?? [],
    previewTargets: (row.preview_targets_json as ContractProjectRecord["previewTargets"]) ?? [],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    latestRunId: row.latest_run_id ? String(row.latest_run_id) : null,
    latestPublishId: row.latest_publish_id ? String(row.latest_publish_id) : null,
  };
}

function parseRunRow(row: Record<string, unknown>): ContractProjectRunRecord {
  return {
    workspaceId: String(row.workspace_id),
    projectId: String(row.project_id),
    runId: String(row.run_id),
    surfaceId: String(row.surface_id),
    status: String(row.status) as ContractProjectRunStatus,
    tool: "codex",
    baseBranch: String(row.base_branch),
    baselineBranch: row.baseline_branch ? String(row.baseline_branch) : null,
    guidedBranch: row.guided_branch ? String(row.guided_branch) : null,
    previewUrl: row.preview_url ? String(row.preview_url) : null,
    artifactRootRef: row.artifact_root_ref ? String(row.artifact_root_ref) : null,
    summaryJson: (row.summary_json as Record<string, unknown> | null) ?? null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null,
  };
}

function parsePublishRow(row: Record<string, unknown>): ContractProjectPublishRecord {
  return {
    workspaceId: String(row.workspace_id),
    projectId: String(row.project_id),
    publishId: String(row.publish_id),
    status: String(row.status) as PublishStatus,
    branchName: String(row.branch_name),
    commitSha: row.commit_sha ? String(row.commit_sha) : null,
    pullRequestNumber: typeof row.pull_request_number === "number" ? row.pull_request_number : null,
    pullRequestUrl: row.pull_request_url ? String(row.pull_request_url) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null,
  };
}

export async function listContractProjects(workspaceId: string): Promise<ContractProjectRecord[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT *
       FROM contract_projects
      WHERE workspace_id = $1
      ORDER BY updated_at DESC, project_id ASC`,
    [workspaceId],
  );
  return result.rows.map((row) => parseProjectRow(row));
}

export async function getContractProject(
  workspaceId: string,
  projectId: string,
): Promise<ContractProjectRecord | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT *
       FROM contract_projects
      WHERE workspace_id = $1
        AND project_id = $2`,
    [workspaceId, projectId],
  );
  return result.rows[0] ? parseProjectRow(result.rows[0]) : null;
}

export async function createContractProject(input: {
  workspaceId: string;
  project: Omit<ContractProjectInput, "githubToken"> & { githubDefaultBranch: string };
  draftContractJson: Record<string, unknown>;
  githubToken: string;
}): Promise<ContractProjectRecord> {
  const pool = getPool();
  const projectId = randomUUID();
  const draftText = stringifyJson(input.draftContractJson);
  const now = new Date().toISOString();
  const surfaces =
    input.project.surfaces?.map((surface) => ({
      id: surface.id,
      ...(surface.label ? { label: surface.label } : {}),
      implementationBrief:
        surface.implementationBrief?.trim() ||
        `Implement ${surface.label ?? surface.id} to match the connected product surface while respecting the contract.`,
    })) ?? [];
  const previewTargets =
    input.project.previewTargets?.map((target) => ({
      surfaceId: target.surfaceId,
      url: target.url,
      ...(target.waitFor ? { waitFor: target.waitFor } : {}),
      ...(target.urlTemplate ? { urlTemplate: target.urlTemplate } : {}),
      ...(target.authSessionKey ? { authSessionKey: target.authSessionKey } : {}),
    })) ?? [];

  await pool.query("BEGIN");
  try {
    await pool.query(
      `INSERT INTO contract_projects (
         workspace_id,
         project_id,
         name,
         github_owner,
         github_repo,
         github_default_branch,
         contract_path,
         surfaces_json,
         preview_targets_json,
         created_at,
         updated_at,
         latest_run_id,
         latest_publish_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$10,NULL,NULL)`,
      [
        input.workspaceId,
        projectId,
        input.project.name,
        input.project.githubOwner,
        input.project.githubRepo,
        input.project.githubDefaultBranch,
        input.project.contractPath,
        JSON.stringify(surfaces),
        JSON.stringify(previewTargets),
        now,
      ],
    );
    await pool.query(
      `INSERT INTO contract_project_drafts (
         workspace_id,
         project_id,
         contract_json,
         contract_sha256,
         updated_at
       ) VALUES ($1,$2,$3::jsonb,$4,$5)`,
      [input.workspaceId, projectId, JSON.stringify(input.draftContractJson), sha256(draftText), now],
    );
    await pool.query(
      `INSERT INTO contract_project_secrets (
         workspace_id,
         project_id,
         github_token_ciphertext,
         created_at,
         updated_at
       ) VALUES ($1,$2,$3,$4,$4)`,
      [input.workspaceId, projectId, encryptJson({ token: input.githubToken }), now],
    );
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }

  const project = await getContractProject(input.workspaceId, projectId);
  if (!project) {
    throw new Error("Failed to read the created contract project.");
  }
  return project;
}

export async function getContractProjectDraft(
  workspaceId: string,
  projectId: string,
): Promise<ContractProjectDraft | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT workspace_id, project_id, contract_json, contract_sha256, updated_at
       FROM contract_project_drafts
      WHERE workspace_id = $1
        AND project_id = $2`,
    [workspaceId, projectId],
  );
  if (!result.rows[0]) {
    return null;
  }
  return {
    workspaceId,
    projectId,
    contractJson: result.rows[0].contract_json as Record<string, unknown>,
    contractSha256: String(result.rows[0].contract_sha256),
    updatedAt: new Date(String(result.rows[0].updated_at)).toISOString(),
  };
}

export async function saveContractProjectDraft(input: {
  workspaceId: string;
  projectId: string;
  contractJson: Record<string, unknown>;
}): Promise<ContractProjectDraft> {
  const pool = getPool();
  const now = new Date().toISOString();
  const contractText = stringifyJson(input.contractJson);
  await pool.query(
    `UPDATE contract_project_drafts
        SET contract_json = $3::jsonb,
            contract_sha256 = $4,
            updated_at = $5
      WHERE workspace_id = $1
        AND project_id = $2`,
    [input.workspaceId, input.projectId, JSON.stringify(input.contractJson), sha256(contractText), now],
  );
  await pool.query(
    `UPDATE contract_projects
        SET updated_at = $3
      WHERE workspace_id = $1
        AND project_id = $2`,
    [input.workspaceId, input.projectId, now],
  );
  const draft = await getContractProjectDraft(input.workspaceId, input.projectId);
  if (!draft) {
    throw new Error("Failed to save the contract draft.");
  }
  return draft;
}

export async function listContractProjectRuns(
  workspaceId: string,
  projectId: string,
): Promise<ContractProjectRunRecord[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT *
       FROM contract_project_runs
      WHERE workspace_id = $1
        AND project_id = $2
      ORDER BY created_at DESC, run_id DESC`,
    [workspaceId, projectId],
  );
  return result.rows.map((row) => parseRunRow(row));
}

export async function getContractProjectRun(
  workspaceId: string,
  projectId: string,
  runId: string,
): Promise<ContractProjectRunRecord | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT *
       FROM contract_project_runs
      WHERE workspace_id = $1
        AND project_id = $2
        AND run_id = $3`,
    [workspaceId, projectId, runId],
  );
  return result.rows[0] ? parseRunRow(result.rows[0]) : null;
}

export async function createContractProjectRun(input: {
  workspaceId: string;
  projectId: string;
  surfaceId: string;
  baseBranch: string;
}): Promise<ContractProjectRunRecord> {
  const pool = getPool();
  const runId = randomUUID();
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO contract_project_runs (
       workspace_id,
       project_id,
       run_id,
       surface_id,
       status,
       tool,
       base_branch,
       created_at,
       updated_at
     ) VALUES ($1,$2,$3,$4,'queued','codex',$5,$6,$6)`,
    [input.workspaceId, input.projectId, runId, input.surfaceId, input.baseBranch, now],
  );
  return (await getContractProjectRun(input.workspaceId, input.projectId, runId))!;
}

export async function updateContractProjectRun(input: {
  workspaceId: string;
  projectId: string;
  runId: string;
  status: ContractProjectRunStatus;
  baselineBranch?: string | null;
  guidedBranch?: string | null;
  previewUrl?: string | null;
  artifactRootRef?: string | null;
  summaryJson?: Record<string, unknown> | null;
  errorMessage?: string | null;
  completedAt?: string | null;
}): Promise<ContractProjectRunRecord> {
  const pool = getPool();
  const now = new Date().toISOString();
  await pool.query(
    `UPDATE contract_project_runs
        SET status = $4,
            baseline_branch = COALESCE($5, baseline_branch),
            guided_branch = COALESCE($6, guided_branch),
            preview_url = COALESCE($7, preview_url),
            artifact_root_ref = COALESCE($8, artifact_root_ref),
            summary_json = COALESCE($9::jsonb, summary_json),
            error_message = $10,
            completed_at = COALESCE($11, completed_at),
            updated_at = $12
      WHERE workspace_id = $1
        AND project_id = $2
        AND run_id = $3`,
    [
      input.workspaceId,
      input.projectId,
      input.runId,
      input.status,
      input.baselineBranch ?? null,
      input.guidedBranch ?? null,
      input.previewUrl ?? null,
      input.artifactRootRef ?? null,
      input.summaryJson ? JSON.stringify(input.summaryJson) : null,
      input.errorMessage ?? null,
      input.completedAt ?? null,
      now,
    ],
  );
  await pool.query(
    `UPDATE contract_projects
        SET latest_run_id = $3,
            updated_at = $4
      WHERE workspace_id = $1
        AND project_id = $2`,
    [input.workspaceId, input.projectId, input.runId, now],
  );
  return (await getContractProjectRun(input.workspaceId, input.projectId, input.runId))!;
}

export async function saveAuthSession(input: {
  workspaceId: string;
  projectId: string;
  authSessionKey: string;
  surfaceId: string;
  environmentId: string;
  previewOrigin: string;
  storageState: Record<string, unknown>;
  expiresAt?: string | null;
}): Promise<ContractProjectAuthSession> {
  const pool = getPool();
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO contract_project_auth_sessions (
       workspace_id,
       project_id,
       auth_session_key,
       surface_id,
       environment_id,
       preview_origin,
       storage_state_ciphertext,
       created_at,
       updated_at,
       expires_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9)
     ON CONFLICT (workspace_id, project_id, auth_session_key)
     DO UPDATE SET
       surface_id = EXCLUDED.surface_id,
       environment_id = EXCLUDED.environment_id,
       preview_origin = EXCLUDED.preview_origin,
       storage_state_ciphertext = EXCLUDED.storage_state_ciphertext,
       updated_at = EXCLUDED.updated_at,
       expires_at = EXCLUDED.expires_at`,
    [
      input.workspaceId,
      input.projectId,
      input.authSessionKey,
      input.surfaceId,
      input.environmentId,
      input.previewOrigin,
      encryptJson(input.storageState),
      now,
      input.expiresAt ?? null,
    ],
  );
  return {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    authSessionKey: input.authSessionKey,
    surfaceId: input.surfaceId,
    environmentId: input.environmentId,
    previewOrigin: input.previewOrigin,
    storageState: input.storageState,
    createdAt: now,
    updatedAt: now,
    expiresAt: input.expiresAt ?? null,
  };
}

export async function getAuthSession(
  workspaceId: string,
  projectId: string,
  authSessionKey: string,
): Promise<ContractProjectAuthSession | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT *
       FROM contract_project_auth_sessions
      WHERE workspace_id = $1
        AND project_id = $2
        AND auth_session_key = $3`,
    [workspaceId, projectId, authSessionKey],
  );
  if (!result.rows[0]) {
    return null;
  }
  const row = result.rows[0];
  return {
    workspaceId,
    projectId,
    authSessionKey,
    surfaceId: String(row.surface_id),
    environmentId: String(row.environment_id),
    previewOrigin: String(row.preview_origin),
    storageState: decryptJson<Record<string, unknown>>(String(row.storage_state_ciphertext)),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
  };
}

export async function hasAuthSession(
  workspaceId: string,
  projectId: string,
  authSessionKey: string,
): Promise<boolean> {
  return Boolean(await getAuthSession(workspaceId, projectId, authSessionKey));
}

export async function getGitHubToken(workspaceId: string, projectId: string): Promise<string> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT github_token_ciphertext
       FROM contract_project_secrets
      WHERE workspace_id = $1
        AND project_id = $2`,
    [workspaceId, projectId],
  );
  if (!result.rows[0]) {
    throw new Error(`GitHub credentials for project ${projectId} not found.`);
  }
  const payload = decryptJson<{ token: string }>(String(result.rows[0].github_token_ciphertext));
  if (!payload.token?.trim()) {
    throw new Error(`GitHub credentials for project ${projectId} are invalid.`);
  }
  return payload.token;
}

export async function listProjectPublishes(
  workspaceId: string,
  projectId: string,
): Promise<ContractProjectPublishRecord[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT *
       FROM contract_project_publishes
      WHERE workspace_id = $1
        AND project_id = $2
      ORDER BY created_at DESC, publish_id DESC`,
    [workspaceId, projectId],
  );
  return result.rows.map((row) => parsePublishRow(row));
}

export async function createProjectPublish(input: {
  workspaceId: string;
  projectId: string;
  branchName: string;
}): Promise<ContractProjectPublishRecord> {
  const pool = getPool();
  const publishId = randomUUID();
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO contract_project_publishes (
       workspace_id,
       project_id,
       publish_id,
       status,
       branch_name,
       created_at,
       updated_at
     ) VALUES ($1,$2,$3,'queued',$4,$5,$5)`,
    [input.workspaceId, input.projectId, publishId, input.branchName, now],
  );
  const result = await pool.query(
    `SELECT *
       FROM contract_project_publishes
      WHERE workspace_id = $1
        AND project_id = $2
        AND publish_id = $3`,
    [input.workspaceId, input.projectId, publishId],
  );
  return parsePublishRow(result.rows[0]);
}

export async function updateProjectPublish(input: {
  workspaceId: string;
  projectId: string;
  publishId: string;
  status: PublishStatus;
  commitSha?: string | null;
  pullRequestNumber?: number | null;
  pullRequestUrl?: string | null;
  errorMessage?: string | null;
  completedAt?: string | null;
}): Promise<ContractProjectPublishRecord> {
  const pool = getPool();
  const now = new Date().toISOString();
  await pool.query(
    `UPDATE contract_project_publishes
        SET status = $4,
            commit_sha = COALESCE($5, commit_sha),
            pull_request_number = COALESCE($6, pull_request_number),
            pull_request_url = COALESCE($7, pull_request_url),
            error_message = $8,
            completed_at = COALESCE($9, completed_at),
            updated_at = $10
      WHERE workspace_id = $1
        AND project_id = $2
        AND publish_id = $3`,
    [
      input.workspaceId,
      input.projectId,
      input.publishId,
      input.status,
      input.commitSha ?? null,
      input.pullRequestNumber ?? null,
      input.pullRequestUrl ?? null,
      input.errorMessage ?? null,
      input.completedAt ?? null,
      now,
    ],
  );
  await pool.query(
    `UPDATE contract_projects
        SET latest_publish_id = $3,
            updated_at = $4
      WHERE workspace_id = $1
        AND project_id = $2`,
    [input.workspaceId, input.projectId, input.publishId, now],
  );
  const result = await pool.query(
    `SELECT *
       FROM contract_project_publishes
      WHERE workspace_id = $1
        AND project_id = $2
        AND publish_id = $3`,
    [input.workspaceId, input.projectId, input.publishId],
  );
  return parsePublishRow(result.rows[0]);
}
