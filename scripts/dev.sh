#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

usage() {
  echo "Usage: $0 {up|down|reset|psql|seed}"
  exit 1
}

wait_ready() {
  local i
  for i in $(seq 1 30); do
    if docker compose exec -T greenhouse-db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for postgres"
  exit 1
}

cmd="${1:-}"
case "$cmd" in
  up)
    docker compose up -d
    wait_ready
    echo "greenhouse-db is up"
    ;;
  down)
    docker compose down
    ;;
  reset)
    docker compose down -v
    docker compose up -d
    wait_ready
    echo "greenhouse-db reset (schema + seed applied)"
    ;;
  psql)
    docker compose exec greenhouse-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    ;;
  seed)
    docker compose exec -T greenhouse-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/seed.sql
    echo "seed applied"
    ;;
  *)
    usage
    ;;
esac
