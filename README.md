# Smart Greenhouse

Local Postgres plus a TypeScript Express API (pnpm + tsx) for irrigation readings, watering decisions, and per-bed settings.

## Setup

```bash
cp .env.example .env   # edit credentials if you want
./scripts/dev.sh up
cd backend && pnpm install
pnpm start             # http://127.0.0.1:3000
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

## Web (R3F)

```bash
cd web && pnpm install && pnpm dev
```

Vite + React Three Fiber. `App.tsx` mounts a `<Canvas>`; `greenhouse/Greenhouse.tsx` composes the scene from small groups (structure, beds, plants, electronics, wires, water, ground). Units are inches; layout lives in `greenhouse/config.ts`. Overlay UI sits on top; bed views / watering are local state for now. Vite proxies `/api` → `http://127.0.0.1:3000`.

## API

TypeScript Express app in `backend/` (`pnpm` + `tsx`). Server owns decisions and enqueues water into durable `pending_actions`; the Pi polls `GET /actions`, which claims rows into `watering_events`. A future web UI changes settings and calls `POST /water`; it never talks to GPIO.

In `backend/`: `pnpm start`, `pnpm dev` (watch), `pnpm typecheck`. Copy `backend/.env.example` → `backend/.env` and set `SESSION_SECRET` + `API_TOKEN` (dev placeholders are fine locally). API listens on `0.0.0.0:3000` by default so a Pi on the LAN can connect (`HOST=127.0.0.1` for local-only).

### Auth

- **Web:** greenhouse name + password → httpOnly session cookie. UI and human routes (`/beds`, `/status`, `/water`) require a session.
- **Pi:** `Authorization: Bearer $API_TOKEN` on `/readings`, `/actions`, `/actions/complete`.
- **Accounts** live in Postgres (`accounts`). Create one (or two):

```bash
# apply migrate if the DB already existed before accounts:
#   docker compose exec -T greenhouse-db psql -U greenhouse -d greenhouse < db/migrate_accounts.sql
cd backend
pnpm create-account "My Greenhouse" 'your-password'
```

Export `DATABASE_URL` (or rely on the default in `db.ts`) when running `create-account`.

## Pi setup

Assumes on the Pi:

- App dir `/srv/greenhouseapp/` (mode `700`, owner `greenhouseapp:greenhouseapp`)
- System user `greenhouseapp` (no login password)
- Admin user `greenhousedev` (sudo)
- Groups `i2c` and `gpio` available for later sensors (service adds them as supplementary groups)

### 1. API on the Mac (or host)

```bash
./scripts/dev.sh up
cd backend && pnpm start   # listens on 0.0.0.0:3000
```

Note your Mac’s LAN IP (e.g. `ipconfig getifaddr en0`).

### 2. Copy files to the Pi

From the Mac (as `greenhousedev`):

```bash
scp pi/stub.py pi/requirements.txt pi/greenhouseapp.service pi/greenhouseapp.env.example \
  greenhousedev@<pi-host>:~/
```

On the Pi:

```bash
sudo mkdir -p /srv/greenhouseapp
sudo mv ~/stub.py ~/requirements.txt /srv/greenhouseapp/
sudo chown -R greenhouseapp:greenhouseapp /srv/greenhouseapp
sudo chmod 700 /srv/greenhouseapp
```

### 3. venv + deps

Still on the Pi as `greenhousedev`:

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip

sudo -u greenhouseapp python3 -m venv /srv/greenhouseapp/.venv
sudo -u greenhouseapp /srv/greenhouseapp/.venv/bin/pip install --upgrade pip
sudo -u greenhouseapp /srv/greenhouseapp/.venv/bin/pip install -r /srv/greenhouseapp/requirements.txt
```

(`requirements.txt` is empty for now — the stub is stdlib-only. Add GPIO/I2C packages there later.)

Ensure `greenhouseapp` can use hardware later:

```bash
sudo usermod -aG i2c,gpio greenhouseapp
```

### 4. Env file for the service

```bash
sudo cp ~/greenhouseapp.env.example /etc/greenhouseapp.env
sudo nano /etc/greenhouseapp.env   # set API_URL=http://<mac-lan-ip>:3000 and API_TOKEN
sudo chown root:greenhouseapp /etc/greenhouseapp.env
sudo chmod 640 /etc/greenhouseapp.env
```

### 5. systemd unit (start on boot as `greenhouseapp`)

```bash
sudo cp ~/greenhouseapp.service /etc/systemd/system/greenhouseapp.service
sudo systemctl daemon-reload
sudo systemctl enable --now greenhouseapp.service
sudo systemctl status greenhouseapp.service
journalctl -u greenhouseapp.service -f
```

Useful controls: `sudo systemctl restart greenhouseapp` / `stop` / `disable`.

### Pi stub behavior

[`pi/stub.py`](pi/stub.py) fakes sensors, posts readings, **leases** actions via `GET /actions`, simulates watering (sleep; no GPIO yet), then **`POST /actions/complete`**. Only then is a `watering_events` row written. Defaults: `READ_MS=60000`, `POLL_MS=30000`. Use `STUB_WATER_CAP_S=5` in the env file so demos don’t sleep a full 120s; omit the cap when valves are real.

After updating `stub.py` on the Pi: copy it to `/srv/greenhouseapp/`, `chown`, `sudo systemctl restart greenhouseapp`.

One Pi process; per-bed settings, watering, and read timers. Batch `POST /readings` only when several beds are due together.

```text
Pi  --POST /readings-------->  API  -->  DB
UI  --POST /water----------->  API  -->  pending_actions
Pi  --GET /actions----------->  lease pending (claimed_at)
Pi  -- valves / stub sleep ->
Pi  --POST /actions/complete->  watering_events + delete pending
```

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/login` | — | Greenhouse name + password → session cookie |
| `POST` | `/signup` | — | Create account + session cookie |
| `POST` | `/logout` | — | Clear session cookie |
| `GET` | `/me` | cookie | Current account |
| `POST` | `/readings` | Bearer | Ingest samples; auto-enqueue if needed |
| `POST` | `/water` | cookie | Manual enqueue (overrides pending auto) |
| `GET` | `/actions` | Bearer | Lease unclaimed/stale pending actions (no event yet) |
| `POST` | `/actions/complete` | Bearer | Pi confirms water ran → write `watering_events` |
| `GET` | `/beds` | cookie | List beds + settings |
| `GET` | `/status` | cookie | Latest reading per bed (web overlay) |
| `GET`/`PATCH` | `/beds/{id}/settings` | cookie | Read/update thresholds (settings UI later) |

Out of scope for v1: WebSockets/MQTT, OAuth.

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

`duration_s` is optional; default each bed’s `settings.max_duration_s` (never above that max). Manual always proceeds — no `min_interval_min` check — and **replaces** any pending/leased row for that bed (`trigger = 'manual'`, `claimed_at` cleared).

### `GET /actions` (lease)

Sets `claimed_at` on eligible rows. Does **not** write `watering_events`. Reclaims leases older than `max(2 * duration_s, 60)` seconds if the Pi never completed.

```json
{
  "actions": [
    { "id": "1", "bed_id": 2, "water_for_s": 90 }
  ]
}
```

### `POST /actions/complete` (confirm)

Pi reports what actually ran. API inserts `watering_events` and deletes those pending rows. Unknown ids are ignored (idempotent retries).

```json
{
  "completions": [
    {
      "id": "1",
      "started_at": "2026-10-12T15:00:00.000Z",
      "duration_s": 90
    }
  ]
}
```

Response: `{ "completed": 1, "unknown_ids": [] }`.

### Curl smoke test

```bash
# auto-enqueue (moisture below 30)
curl -s -X POST http://127.0.0.1:3000/readings \
  -H 'content-type: application/json' \
  -d '{"readings":[{"bed_id":1,"soil_moisture":20}]}'

# lease (note the id) — pending stays until complete
curl -s http://127.0.0.1:3000/actions

curl -s -X POST http://127.0.0.1:3000/actions/complete \
  -H 'content-type: application/json' \
  -d '{"completions":[{"id":"1","started_at":"2026-10-12T15:00:00Z","duration_s":5}]}'
```

### Existing DB migration

If the DB was created before `claimed_at` existed:

```bash
source .env
docker compose exec -T greenhouse-db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/migrate_pending_claimed_at.sql
```

Or `./scripts/dev.sh reset` (wipes data).

### Pi scheduling (per-bed clocks)

- Each bed has a Pi-local `next_read_at` (not a DB table in v1).
- On tick: read only due beds → `POST /readings` for those → set their `next_read_at = now + 10m`.
- After **any** watering (auto or manual), once the Pi runs the action for a bed: set `next_read_at[bed] = now + 10m` for that bed only. Other beds keep their clocks.
- Rationale: moisture is noisy right after irrigation; cadence stays per-bed.

`settings.min_interval_min` is the **auto-only** server guard against watering too often; poll reset is the Pi guard against sensing too soon after water. Manual always wins over auto in the queue.

### Database

Tables: `beds`, `readings`, `watering_events` (completed water only), `settings`, `pending_actions` (one row per bed; `claimed_at` = lease).
