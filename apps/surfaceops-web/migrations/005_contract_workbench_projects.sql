CREATE TABLE IF NOT EXISTS contract_projects (
  workspace_id text NOT NULL,
  project_id text NOT NULL,
  name text NOT NULL,
  github_owner text NOT NULL,
  github_repo text NOT NULL,
  github_default_branch text NOT NULL,
  contract_path text NOT NULL,
  surfaces_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  preview_targets_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  latest_run_id text,
  latest_publish_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, project_id),
  CHECK (jsonb_typeof(surfaces_json) = 'array'),
  CHECK (jsonb_typeof(preview_targets_json) = 'array')
);

CREATE INDEX IF NOT EXISTS contract_projects_workspace_updated_idx
  ON contract_projects (workspace_id, updated_at DESC, project_id ASC);

CREATE TABLE IF NOT EXISTS contract_project_drafts (
  workspace_id text NOT NULL,
  project_id text NOT NULL,
  contract_json jsonb NOT NULL,
  contract_sha256 text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, project_id),
  CHECK (jsonb_typeof(contract_json) = 'object')
);

CREATE TABLE IF NOT EXISTS contract_project_secrets (
  workspace_id text NOT NULL,
  project_id text NOT NULL,
  github_token_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, project_id)
);

CREATE TABLE IF NOT EXISTS contract_project_runs (
  workspace_id text NOT NULL,
  project_id text NOT NULL,
  run_id text NOT NULL,
  surface_id text NOT NULL,
  status text NOT NULL,
  tool text NOT NULL DEFAULT 'codex',
  base_branch text NOT NULL,
  baseline_branch text,
  guided_branch text,
  preview_url text,
  artifact_root_ref text,
  summary_json jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (workspace_id, project_id, run_id),
  CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  CHECK (tool IN ('codex'))
);

CREATE INDEX IF NOT EXISTS contract_project_runs_workspace_project_created_idx
  ON contract_project_runs (workspace_id, project_id, created_at DESC, run_id DESC);

CREATE TABLE IF NOT EXISTS contract_project_auth_sessions (
  workspace_id text NOT NULL,
  project_id text NOT NULL,
  auth_session_key text NOT NULL,
  surface_id text NOT NULL,
  environment_id text NOT NULL,
  preview_origin text NOT NULL,
  storage_state_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  PRIMARY KEY (workspace_id, project_id, auth_session_key)
);

CREATE INDEX IF NOT EXISTS contract_project_auth_sessions_workspace_project_surface_idx
  ON contract_project_auth_sessions (workspace_id, project_id, surface_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS contract_project_publishes (
  workspace_id text NOT NULL,
  project_id text NOT NULL,
  publish_id text NOT NULL,
  status text NOT NULL,
  branch_name text NOT NULL,
  commit_sha text,
  pull_request_number integer,
  pull_request_url text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (workspace_id, project_id, publish_id),
  CHECK (status IN ('queued', 'running', 'succeeded', 'failed'))
);

CREATE INDEX IF NOT EXISTS contract_project_publishes_workspace_project_created_idx
  ON contract_project_publishes (workspace_id, project_id, created_at DESC, publish_id DESC);
