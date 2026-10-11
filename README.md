# Smart Greenhouse — database

Local Postgres for irrigation readings, watering events, and per-bed settings.

## Setup

```bash
cp .env.example .env   # edit credentials if you want
./scripts/dev.sh up
```

## Commands

| Command | What it does |
|---------|----------------|
| `./scripts/dev.sh up` | Start Postgres |
| `./scripts/dev.sh down` | Stop containers |
| `./scripts/dev.sh reset` | Drop the volume, recreate DB, re-apply schema + seed |
| `./scripts/dev.sh psql` | Open a `psql` shell in the container |
| `./scripts/dev.sh seed` | Re-run `db/seed.sql` (idempotent) |

## Connect

From the host:

```
postgresql://POSTGRES_USER:POSTGRES_PASSWORD@127.0.0.1:5432/POSTGRES_DB
```

With the defaults from `.env.example`:

```
postgresql://greenhouse:greenhouse@127.0.0.1:5432/greenhouse
```

Or: `./scripts/dev.sh psql`

## API

TypeScript Express app in `backend/` (run with `tsx`). Server owns decisions and enqueues water into durable `pending_actions`; the Pi polls `GET /actions`, which claims rows into `watering_events`. A future web UI changes settings and calls `POST /water`; it never talks to GPIO.

### Run the API

```bash
./scripts/dev.sh up          # Postgres
cd backend && pnpm install
pnpm start                   # http://127.0.0.1:3000
pnpm dev                     # watch mode
pnpm typecheck               # tsc --noEmit
```

Optional: copy `backend/.env.example` → `backend/.env` (defaults already match the DB).

One Pi process; per-bed settings, watering, and read timers. Batch `POST /readings` only when several beds are due together.

```text
Pi  --POST /readings-->  API  -->  DB
UI  --POST /water------>  API  -->  enqueue
UI  --PATCH settings--->  API
Pi  --GET /actions----->  pending actions --> valves
```

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/readings` | Ingest samples for one or more beds; run auto rules; enqueue water if needed |
| `POST` | `/water` | Manual water for specified bed(s) — immediate enqueue |
| `GET` | `/actions` | Pi short-poll (e.g. 10–30s); claim pending actions |
| `GET` | `/beds` | List beds (UI later) |
| `GET`/`PATCH` | `/beds/{id}/settings` | Read/update thresholds (UI later) |

Out of scope for v1: WebSockets/MQTT, watering ack/confirm, auth (optional shared secret later), a separate commands service.

### `POST /readings`

```json
{
  "recorded_at": "2026-10-11T22:00:00Z",
  "readings": [
    {
      "bed_id": 1,
      "soil_moisture": 28.4,
      "temperature": 22.1,
      "humidity": 55.0,
      "light": 410.0
    }
  ]
}
```

Sensor fields are nullable (same as `db/schema.sql`). Response is `{ "accepted": N }` only — no water commands in this response.

**Auto rules (server):** for each reading, if `soil_moisture` is present and below that bed’s `settings.moisture_threshold`, and the last `watering_events` row for the bed is older than `min_interval_min`, enqueue into `pending_actions` with `trigger = 'auto'`. Skips if that bed already has a pending row (`ON CONFLICT DO NOTHING`).

### `POST /water`

```json
{ "bed_ids": [2, 3], "duration_s": 90 }
```

`duration_s` is optional; default each bed’s `settings.max_duration_s` (never above that max). Manual always proceeds — no `min_interval_min` check — and **replaces** any pending auto for that bed (`trigger = 'manual'`).

### `GET /actions`

```json
{
  "actions": [
    { "bed_id": 2, "water_for_s": 90 }
  ]
}
```

Empty `actions` when nothing is pending. Delivery only — the Pi does not care whether the enqueue was auto or manual. Claim deletes `pending_actions` and inserts `watering_events` in one transaction.

### Curl smoke test

```bash
# auto-enqueue (moisture below 30)
curl -s -X POST http://127.0.0.1:3000/readings \
  -H 'content-type: application/json' \
  -d '{"readings":[{"bed_id":1,"soil_moisture":20}]}'

curl -s http://127.0.0.1:3000/actions

# manual (overrides pending auto on same bed)
curl -s -X POST http://127.0.0.1:3000/water \
  -H 'content-type: application/json' \
  -d '{"bed_ids":[1],"duration_s":90}'

curl -s http://127.0.0.1:3000/actions
```

### Pi scheduling (per-bed clocks)

- Each bed has a Pi-local `next_read_at` (not a DB table in v1).
- On tick: read only due beds → `POST /readings` for those → set their `next_read_at = now + 10m`.
- After **any** watering (auto or manual), once the Pi runs the action for a bed: set `next_read_at[bed] = now + 10m` for that bed only. Other beds keep their clocks.
- Rationale: moisture is noisy right after irrigation; cadence stays per-bed.

`settings.min_interval_min` is the **auto-only** server guard against watering too often; poll reset is the Pi guard against sensing too soon after water. Manual always wins over auto in the queue.

### Database

Tables: `beds`, `readings`, `watering_events`, `settings`, `pending_actions` (one pending row per bed, durable across API restarts).
