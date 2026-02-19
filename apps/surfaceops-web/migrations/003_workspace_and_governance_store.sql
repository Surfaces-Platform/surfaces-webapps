-- workspace hardening + governance store persistence
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- events uniqueness must be workspace-scoped
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS events_workspace_event_unique
  ON events (workspace_id, event_id);

-- contract_runs must be workspace-scoped
ALTER TABLE contract_runs ADD COLUMN IF NOT EXISTS workspace_id text;
UPDATE contract_runs
SET workspace_id = 'ws-local-default'
WHERE workspace_id IS NULL OR btrim(workspace_id) = '';
ALTER TABLE contract_runs ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE contract_runs DROP CONSTRAINT IF EXISTS contract_runs_run_id_key;
DROP INDEX IF EXISTS contract_runs_idempotency_key_unique;
DROP INDEX IF EXISTS contract_runs_surface_source_created_at_idx;
DROP INDEX IF EXISTS contract_runs_surface_created_at_idx;

CREATE UNIQUE INDEX IF NOT EXISTS contract_runs_workspace_run_id_unique
  ON contract_runs (workspace_id, run_id);

CREATE UNIQUE INDEX IF NOT EXISTS contract_runs_workspace_idempotency_key_unique
  ON contract_runs (workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS contract_runs_workspace_surface_source_created_at_idx
  ON contract_runs (workspace_id, surface_id, source, created_at DESC, run_id DESC);

CREATE INDEX IF NOT EXISTS contract_runs_workspace_surface_created_at_idx
  ON contract_runs (workspace_id, surface_id, created_at DESC, run_id DESC);

-- governance mutable state: db-primary persistence
CREATE TABLE IF NOT EXISTS governance_contract_drafts (
  workspace_id text NOT NULL,
  prototype_id text NOT NULL,
  contract_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, prototype_id),
  CHECK (jsonb_typeof(contract_json) = 'object')
);

CREATE TABLE IF NOT EXISTS governance_snapshots (
  workspace_id text NOT NULL,
  prototype_id text NOT NULL,
  snapshot_id text NOT NULL,
  created_at timestamptz NOT NULL,
  report_json jsonb NOT NULL,
  PRIMARY KEY (workspace_id, prototype_id, snapshot_id),
  CHECK (jsonb_typeof(report_json) = 'object')
);

CREATE TABLE IF NOT EXISTS governance_snapshot_heads (
  workspace_id text NOT NULL,
  prototype_id text NOT NULL,
  baseline_snapshot_id text,
  latest_snapshot_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, prototype_id)
);

CREATE TABLE IF NOT EXISTS governance_decisions (
  workspace_id text NOT NULL,
  prototype_id text NOT NULL,
  decision_id text NOT NULL,
  snapshot_id text NOT NULL,
  diff_item_id text NOT NULL,
  action text NOT NULL,
  reason text,
  actor text NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, prototype_id, decision_id),
  CHECK (action IN ('accept', 'reject', 'evolve'))
);

CREATE INDEX IF NOT EXISTS governance_decisions_workspace_proto_snapshot_created_idx
  ON governance_decisions (workspace_id, prototype_id, snapshot_id, created_at DESC, decision_id DESC);

CREATE TABLE IF NOT EXISTS governance_applies (
  workspace_id text NOT NULL,
  prototype_id text NOT NULL,
  apply_id text NOT NULL,
  snapshot_id text NOT NULL,
  actor text NOT NULL,
  created_at timestamptz NOT NULL,
  items_json jsonb NOT NULL,
  PRIMARY KEY (workspace_id, prototype_id, apply_id),
  CHECK (jsonb_typeof(items_json) = 'array')
);

CREATE INDEX IF NOT EXISTS governance_applies_workspace_proto_snapshot_created_idx
  ON governance_applies (workspace_id, prototype_id, snapshot_id, created_at DESC, apply_id DESC);

CREATE TABLE IF NOT EXISTS governance_inspector_baselines (
  workspace_id text NOT NULL,
  prototype_id text NOT NULL,
  target_url text NOT NULL,
  contract_json jsonb NOT NULL,
  required_sections text[] NOT NULL DEFAULT '{}',
  source_snapshot_captured_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, prototype_id, target_url),
  CHECK (jsonb_typeof(contract_json) = 'object')
);

CREATE INDEX IF NOT EXISTS governance_snapshots_workspace_proto_created_idx
  ON governance_snapshots (workspace_id, prototype_id, created_at ASC, snapshot_id ASC);
