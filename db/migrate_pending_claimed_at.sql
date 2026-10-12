-- Run against an existing DB (reset already has this in schema.sql):
--   ./scripts/dev.sh psql -f ...  or pipe via docker compose exec
ALTER TABLE pending_actions
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS pending_actions_claimed_at_idx
  ON pending_actions (claimed_at);
