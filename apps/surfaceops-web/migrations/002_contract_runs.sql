-- contract_runs: normalized run-history store for SurfaceOps RunStore
CREATE TABLE IF NOT EXISTS contract_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL UNIQUE,
  idempotency_key text,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL,
  surface_id text NOT NULL,
  source text NOT NULL,
  status text NOT NULL,
  contract_id text NOT NULL,
  contract_version text NOT NULL,
  contract_sha256 text NOT NULL,
  artifacts_extraction_path text,
  artifacts_report_path text,
  finding_codes text[] NOT NULL DEFAULT '{}',
  error_count integer NOT NULL DEFAULT 0,
  warn_count integer NOT NULL DEFAULT 0,
  created_row_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source IN ('bootstrap', 'generation', 'ci', 'runtime')),
  CHECK (status IN ('pass', 'warn', 'fail', 'unknown')),
  CHECK (error_count >= 0),
  CHECK (warn_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS contract_runs_idempotency_key_unique
  ON contract_runs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS contract_runs_surface_source_created_at_idx
  ON contract_runs (surface_id, source, created_at DESC, run_id DESC);

CREATE INDEX IF NOT EXISTS contract_runs_surface_created_at_idx
  ON contract_runs (surface_id, created_at DESC, run_id DESC);
