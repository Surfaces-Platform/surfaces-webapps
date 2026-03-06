CREATE TABLE IF NOT EXISTS invite_requests (
  email text PRIMARY KEY,
  source text NOT NULL DEFAULT 'landing-page',
  created_at timestamptz NOT NULL DEFAULT now()
);
