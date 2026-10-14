/** Thin fetch helpers — Vite proxies /api → Express. */

export type StatusBed = {
  id: number;
  name: string;
  soil_moisture: number | null;
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  recorded_at: string | null;
};

export type StatusResponse = {
  beds: StatusBed[];
  updated_at: string | null;
};

export async function fetchStatus(): Promise<StatusResponse> {
  const res = await fetch("/api/status");
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json() as Promise<StatusResponse>;
}

export async function postWater(bedIds: number[], durationS?: number) {
  const res = await fetch("/api/water", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      bed_ids: bedIds,
      ...(durationS != null ? { duration_s: durationS } : {}),
    }),
  });
  if (!res.ok) throw new Error(`water ${res.status}`);
  return res.json() as Promise<{
    enqueued: { bed_id: number; duration_s: number }[];
  }>;
}
