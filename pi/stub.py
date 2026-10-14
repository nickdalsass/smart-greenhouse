#!/usr/bin/env python3
"""Pi stub: fake sensors + claim/complete watering. No GPIO yet.

  API_URL=http://<mac-lan-ip>:3000 python3 stub.py

Env: API_URL, API_TOKEN (Bearer for Pi routes), READ_MS (default 60000),
     POLL_MS (default 30000), STUB_WATER_CAP_S (optional) — cap sleep for demos.
"""

from __future__ import annotations

import json
import os
import random
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

API_URL = os.environ.get("API_URL", "http://127.0.0.1:3000").rstrip("/")
API_TOKEN = os.environ.get("API_TOKEN", "")
READ_MS = int(os.environ.get("READ_MS", "60000"))
POLL_MS = int(os.environ.get("POLL_MS", "30000"))
_cap = os.environ.get("STUB_WATER_CAP_S")
STUB_WATER_CAP_S = int(_cap) if _cap not in (None, "") else None
BED_IDS = (1, 2, 3)

next_read_at = {bed_id: 0.0 for bed_id in BED_IDS}


def fake_reading(bed_id: int) -> dict:
    # ponytail: random moisture so auto sometimes fires without real sensors
    return {
        "bed_id": bed_id,
        "soil_moisture": 20 + random.random() * 25,
        "temperature": 20 + random.random() * 5,
        "humidity": 45 + random.random() * 20,
        "light": 200 + random.random() * 400,
    }


def request_json(method: str, path: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode()
    headers: dict[str, str] = {}
    if body is not None:
        headers["content-type"] = "application/json"
    if API_TOKEN:
        headers["authorization"] = f"Bearer {API_TOKEN}"
    req = urllib.request.Request(
        f"{API_URL}{path}",
        data=data,
        method=method,
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            raw = res.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as err:
        print(f"{method} {path} → {err.code} {err.read().decode()}", flush=True)
        raise
    except urllib.error.URLError as err:
        print(f"{method} {path} → {err.reason}", flush=True)
        raise


def post_readings(bed_ids: list[int]) -> None:
    readings = [fake_reading(bed_id) for bed_id in bed_ids]
    body = {
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "readings": readings,
    }
    data = request_json("POST", "/readings", body)
    summary = [
        {"bed": r["bed_id"], "moisture": round(r["soil_moisture"], 1)}
        for r in readings
    ]
    print(
        f"readings accepted={data.get('accepted')} beds={bed_ids} {summary}",
        flush=True,
    )


def run_watering(action: dict) -> dict:
    """Simulate valve open; report actual elapsed time on complete."""
    bed_id = action["bed_id"]
    commanded = int(action["water_for_s"])
    sleep_s = float(commanded)
    if STUB_WATER_CAP_S is not None:
        sleep_s = min(sleep_s, float(STUB_WATER_CAP_S))

    started = datetime.now(timezone.utc)
    print(
        f"WATER start bed {bed_id} id={action['id']} "
        f"sleep={sleep_s}s (commanded {commanded}s, stub — no GPIO)",
        flush=True,
    )
    time.sleep(sleep_s)
    elapsed = max(1, int(round(time.time() - started.timestamp())))
    print(f"WATER done bed {bed_id} id={action['id']} duration_s={elapsed}", flush=True)
    return {
        "id": action["id"],
        "started_at": started.isoformat(),
        "duration_s": elapsed,
    }


def poll_actions() -> None:
    data = request_json("GET", "/actions")
    actions = data.get("actions") or []
    if not actions:
        return

    completions = []
    for action in actions:
        completion = run_watering(action)
        completions.append(completion)
        next_read_at[action["bed_id"]] = time.time() + READ_MS / 1000

    result = request_json("POST", "/actions/complete", {"completions": completions})
    print(
        f"complete → completed={result.get('completed')} "
        f"unknown_ids={result.get('unknown_ids')}",
        flush=True,
    )


def read_tick() -> None:
    now = time.time()
    due = [bed_id for bed_id in BED_IDS if next_read_at[bed_id] <= now]
    if not due:
        return
    post_readings(due)
    for bed_id in due:
        next_read_at[bed_id] = now + READ_MS / 1000


def main() -> None:
    cap = f", STUB_WATER_CAP_S={STUB_WATER_CAP_S}" if STUB_WATER_CAP_S is not None else ""
    print(
        f"pi stub → {API_URL} (read every {READ_MS}ms, poll every {POLL_MS}ms{cap})",
        flush=True,
    )
    while True:
        loop_start = time.time()
        try:
            read_tick()
            poll_actions()
        except Exception:
            pass  # errors already printed; keep looping
        elapsed = time.time() - loop_start
        time.sleep(max(0.5, min(POLL_MS, READ_MS) / 1000 - elapsed))


if __name__ == "__main__":
    main()
