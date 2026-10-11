import type { PoolClient } from "pg";

type Trigger = "auto" | "manual";

type PendingRow = {
  id: string;
  bed_id: number;
  duration_s: number;
  trigger: Trigger;
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
  await client.query(
    `INSERT INTO pending_actions (bed_id, duration_s, trigger)
     VALUES ($1, $2, 'manual')
     ON CONFLICT (bed_id) DO UPDATE
     SET duration_s = EXCLUDED.duration_s,
         trigger = 'manual',
         created_at = now()`,
    [bedId, durationS],
  );
}

export async function claimActions(client: PoolClient): Promise<{
  actions: { bed_id: number; water_for_s: number }[];
}> {
  await client.query("BEGIN");
  try {
    const { rows } = await client.query<PendingRow>(
      `SELECT id, bed_id, duration_s, trigger
       FROM pending_actions
       ORDER BY id
       FOR UPDATE`,
    );

    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      await client.query(
        `DELETE FROM pending_actions WHERE id = ANY($1::bigint[])`,
        [ids],
      );
      for (const row of rows) {
        await client.query(
          `INSERT INTO watering_events (bed_id, started_at, duration_s, trigger)
           VALUES ($1, now(), $2, $3)`,
          [row.bed_id, row.duration_s, row.trigger],
        );
      }
    }

    await client.query("COMMIT");
    return {
      actions: rows.map((r) => ({
        bed_id: r.bed_id,
        water_for_s: r.duration_s,
      })),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}
