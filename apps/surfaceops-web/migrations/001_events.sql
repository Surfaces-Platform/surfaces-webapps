CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- events: raw event ingestion, idempotent by event_id
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  workspace_id text NOT NULL,
  project_id text NOT NULL,
  run_id text NOT NULL,
  command text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  raw_envelope jsonb NOT NULL
);
