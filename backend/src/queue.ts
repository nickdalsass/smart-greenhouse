import type { PoolClient } from "pg";

type Trigger = "auto" | "manual";

type PendingRow = {
  id: string;
  bed_id: number;
  duration_s: number;
  trigger: Trigger;
};

export type ActionOut = {
  id: string;
  bed_id: number;
  water_for_s: number;
};

export type CompletionIn = {
  id: string | number;
  started_at: string;
  duration_s: number;
};

export async function enqueueAuto(
  client: PoolClient,
  { bedId, durationS }: { bedId: number; durationS: number },
): Promise<void> {
  await client.query(
    `INSERT INTO pending_actions (bed_id, duration_s, trigger)
     VALUES ($1, $2, 'auto')
     ON CONFLICT (bed_id) DO NOTHING`,
    [bedId, durationS],
  );
}

export async function enqueueManual(
  client: PoolClient,
  { bedId, durationS }: { bedId: number; durationS: number },
): Promise<void> {
  // Replace any pending/leased auto; clear lease so Pi must re-claim
  await client.query(
    `INSERT INTO pending_actions (bed_id, duration_s, trigger)
     VALUES ($1, $2, 'manual')
     ON CONFLICT (bed_id) DO UPDATE
     SET duration_s = EXCLUDED.duration_s,
         trigger = 'manual',
         created_at = now(),
         claimed_at = NULL`,
    [bedId, durationS],
  );
}

/** Lease unclaimed or stale claimed rows. Does not write watering_events. */
export async function claimActions(client: PoolClient): Promise<{
  actions: ActionOut[];
}> {
  await client.query("BEGIN");
  try {
    // Stale = claimed longer than max(2 * duration, 60s) — Pi likely died mid-water
    const { rows } = await client.query<PendingRow>(
      `SELECT id, bed_id, duration_s, trigger
       FROM pending_actions
       WHERE claimed_at IS NULL
          OR claimed_at < now() - make_interval(
               secs => GREATEST(duration_s * 2, 60)
             )
       ORDER BY id
       FOR UPDATE SKIP LOCKED`,
    );

    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      await client.query(
        `UPDATE pending_actions
         SET claimed_at = now()
         WHERE id = ANY($1::bigint[])`,
        [ids],
      );
    }

    await client.query("COMMIT");
    return {
      actions: rows.map((r) => ({
        id: r.id,
        bed_id: r.bed_id,
        water_for_s: r.duration_s,
      })),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

/** Record completed waterings and drop pending rows. Idempotent for unknown ids. */
export async function completeActions(
  client: PoolClient,
  completions: CompletionIn[],
): Promise<{ completed: number; unknown_ids: string[] }> {
  await client.query("BEGIN");
  try {
    let completed = 0;
    const unknown_ids: string[] = [];

    for (const c of completions) {
      const id = String(c.id ?? "").trim();
      if (!id) {
        await client.query("ROLLBACK");
        throw Object.assign(new Error("Each completion needs an id"), {
          status: 400,
        });
      }
      if (!Number.isFinite(c.duration_s) || c.duration_s <= 0) {
        await client.query("ROLLBACK");
        throw Object.assign(new Error("duration_s must be > 0"), {
          status: 400,
        });
      }
      const startedAt = new Date(c.started_at);
      if (Number.isNaN(startedAt.getTime())) {
        await client.query("ROLLBACK");
        throw Object.assign(new Error("Invalid started_at"), { status: 400 });
      }

      const { rows } = await client.query<PendingRow>(
        `SELECT id, bed_id, duration_s, trigger
         FROM pending_actions
         WHERE id = $1
         FOR UPDATE`,
        [id],
      );

      if (rows.length === 0) {
        // Already completed or replaced — safe for Pi retries
        unknown_ids.push(id);
        continue;
      }

      const row = rows[0];
      await client.query(
        `INSERT INTO watering_events (bed_id, started_at, duration_s, trigger)
         VALUES ($1, $2, $3, $4)`,
        [row.bed_id, startedAt.toISOString(), c.duration_s, row.trigger],
      );
      await client.query(`DELETE FROM pending_actions WHERE id = $1`, [id]);
      completed += 1;
    }

    await client.query("COMMIT");
    return { completed, unknown_ids };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}
