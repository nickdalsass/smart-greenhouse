/** Thin fetch helpers — Vite proxies /api → Express. */

const jsonHeaders = { "content-type": "application/json" };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export type Me = { id: number; greenhouse_name: string };

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

export async function fetchMe(): Promise<Me> {
  return api<Me>("/me");
}

export async function login(
  greenhouseName: string,
  password: string,
): Promise<Me> {
  return api<Me>("/login", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      greenhouse_name: greenhouseName,
      password,
    }),
  });
}

export async function signup(
  greenhouseName: string,
  password: string,
): Promise<Me> {
  return api<Me>("/signup", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      greenhouse_name: greenhouseName,
      password,
    }),
  });
}

export async function logout(): Promise<void> {
  await api<{ ok: boolean }>("/logout", { method: "POST" });
}

export async function fetchStatus(): Promise<StatusResponse> {
  return api<StatusResponse>("/status");
}

export async function postWater(bedIds: number[], durationS?: number) {
  return api<{ enqueued: { bed_id: number; duration_s: number }[] }>("/water", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      bed_ids: bedIds,
      ...(durationS != null ? { duration_s: durationS } : {}),
    }),
  });
}
