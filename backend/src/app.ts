import express from "express";
import morgan from "morgan";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  requirePiToken,
  requireSession,
  signupHandler,
} from "./auth.js";
import pool from "./db.js";
import {
  claimActions,
  completeActions,
  enqueueAuto,
  enqueueManual,
  type CompletionIn,
} from "./queue.js";

type ReadingIn = {
  bed_id: number;
  soil_moisture?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  light?: number | null;
};

type SettingsRow = {
  moisture_threshold: number;
  max_duration_s: number;
  min_interval_min: number;
};

const app = express();
app.use(express.json());
app.use(morgan("dev"));

app.post("/login", (req, res) => void loginHandler(req, res));
app.post("/signup", (req, res) => void signupHandler(req, res));
app.post("/logout", logoutHandler);
app.get("/me", (req, res) => void meHandler(req, res));

/** List beds + settings (for UI). */
app.get("/beds", requireSession, async (_req, res) => {
  try {
    const { rows } = await pool.query<{
      id: number;
      name: string;
      moisture_threshold: number;
      max_duration_s: number;
      min_interval_min: number;
    }>(
      `SELECT b.id, b.name,
              s.moisture_threshold, s.max_duration_s, s.min_interval_min
       FROM beds b
       JOIN settings s ON s.bed_id = b.id
       ORDER BY b.id`,
    );
    res.json({
      beds: rows.map((r) => ({
        id: r.id,
        name: r.name,
        settings: {
          moisture_threshold: r.moisture_threshold,
          max_duration_s: r.max_duration_s,
          min_interval_min: r.min_interval_min,
        },
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to list beds" });
  }
});

/** Latest reading per bed (for overlay). */
app.get("/status", requireSession, async (_req, res) => {
  try {
    const { rows } = await pool.query<{
      id: number;
      name: string;
      soil_moisture: number | null;
      temperature: number | null;
      humidity: number | null;
      light: number | null;
      recorded_at: Date | null;
    }>(
      `SELECT b.id, b.name,
              r.soil_moisture, r.temperature, r.humidity, r.light, r.recorded_at
       FROM beds b
       LEFT JOIN LATERAL (
         SELECT soil_moisture, temperature, humidity, light, recorded_at
         FROM readings
         WHERE bed_id = b.id
         ORDER BY recorded_at DESC
         LIMIT 1
       ) r ON true
       ORDER BY b.id`,
    );
    res.json({
      beds: rows.map((r) => ({
        id: r.id,
        name: r.name,
        soil_moisture: r.soil_moisture,
        temperature: r.temperature,
        humidity: r.humidity,
        light: r.light,
        recorded_at: r.recorded_at,
      })),
      // Newest reading across all beds (null if none yet)
      updated_at: rows.reduce<string | null>((best, r) => {
        if (!r.recorded_at) return best;
        const iso = new Date(r.recorded_at).toISOString();
        return best == null || iso > best ? iso : best;
      }, null),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to load status" });
  }
});

app.post("/readings", requirePiToken, async (req, res) => {
  const readings = req.body?.readings as ReadingIn[] | undefined;
  if (!Array.isArray(readings) || readings.length === 0) {
    return res
      .status(400)
      .json({ error: "Readings must be a non-empty array" });
  }

  const recordedAt = (req.body.recorded_at as string | undefined) ?? null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let accepted = 0;

    for (const r of readings) {
      if (r.bed_id == null) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Each reading needs bed_id" });
      }

      await client.query(
        `INSERT INTO readings
           (bed_id, soil_moisture, temperature, humidity, light, recorded_at)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))`,
        [
          r.bed_id,
          r.soil_moisture ?? null,
          r.temperature ?? null,
          r.humidity ?? null,
          r.light ?? null,
          recordedAt,
        ],
      );
      accepted += 1;

      if (r.soil_moisture == null) continue;

      const { rows: settingsRows } = await client.query<SettingsRow>(
        `SELECT moisture_threshold, max_duration_s, min_interval_min
         FROM settings WHERE bed_id = $1`,
        [r.bed_id],
      );
      if (settingsRows.length === 0) continue;

      const s = settingsRows[0];
      if (r.soil_moisture >= s.moisture_threshold) continue;

      const { rows: lastRows } = await client.query<{ started_at: Date }>(
        `SELECT started_at FROM watering_events
         WHERE bed_id = $1
         ORDER BY started_at DESC
         LIMIT 1`,
        [r.bed_id],
      );
      if (lastRows.length > 0) {
        const elapsedMin =
          (Date.now() - new Date(lastRows[0].started_at).getTime()) / 60000;
        if (elapsedMin < s.min_interval_min) continue;
      }

      await enqueueAuto(client, {
        bedId: r.bed_id,
        durationS: s.max_duration_s,
      });
    }

    await client.query("COMMIT");
    res.json({ accepted });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "failed to store readings" });
  } finally {
    client.release();
  }
});

app.post("/water", requireSession, async (req, res) => {
  const bedIds = req.body?.bed_ids as number[] | undefined;
  if (!Array.isArray(bedIds) || bedIds.length === 0) {
    return res.status(400).json({ error: "bed_ids must be a non-empty array" });
  }

  const requestedDuration = req.body.duration_s as number | undefined;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const enqueued: { bed_id: number; duration_s: number }[] = [];

    for (const bedId of bedIds) {
      const { rows } = await client.query<{ max_duration_s: number }>(
        `SELECT max_duration_s FROM settings WHERE bed_id = $1`,
        [bedId],
      );
      if (rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: `unknown bed_id ${bedId}` });
      }

      const maxDuration = rows[0].max_duration_s;
      let durationS = requestedDuration ?? maxDuration;
      if (durationS > maxDuration) durationS = maxDuration;
      if (durationS <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "duration_s must be > 0" });
      }

      await enqueueManual(client, { bedId, durationS });
      enqueued.push({ bed_id: bedId, duration_s: durationS });
    }

    await client.query("COMMIT");
    res.json({ enqueued });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "failed to enqueue water" });
  } finally {
    client.release();
  }
});

app.get("/actions", requirePiToken, async (_req, res) => {
  const client = await pool.connect();
  try {
    const result = await claimActions(client);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to claim actions" });
  } finally {
    client.release();
  }
});

app.post("/actions/complete", requirePiToken, async (req, res) => {
  const completions = req.body?.completions as CompletionIn[] | undefined;
  if (!Array.isArray(completions) || completions.length === 0) {
    return res
      .status(400)
      .json({ error: "completions must be a non-empty array" });
  }

  const client = await pool.connect();
  try {
    const result = await completeActions(client, completions);
    res.json(result);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status !== 500) {
      return res.status(status).json({ error: (err as Error).message });
    }
    console.error(err);
    res.status(500).json({ error: "failed to complete actions" });
  } finally {
    client.release();
  }
});

export default app;
