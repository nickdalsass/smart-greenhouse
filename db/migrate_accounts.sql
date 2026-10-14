-- Run against an existing DB (reset already has this in schema.sql):
--   ./scripts/dev.sh psql -f ...  or pipe via docker compose exec
CREATE TABLE IF NOT EXISTS accounts (
  id serial PRIMARY KEY,
  greenhouse_name text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
