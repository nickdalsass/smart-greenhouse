/** Display helpers for bed telemetry (live or empty). */

export type BedSnapshot = {
  bedId: number;
  name: string;
  soilMoisture: number | null;
  temperature: number | null;
  humidity: number | null;
  light: number | null;
};

/** UI labels — DB seed uses Bed 1/2/3 (= left / back / right). */
export const BED_LABELS: Record<number, string> = {
  1: "Left bed",
  2: "Back bed",
  3: "Right bed",
};

/** Relative clock — seconds while fresh, then minutes / hours. */
export function formatUpdatedAt(d: Date, now = Date.now()): string {
  const sec = Math.max(0, Math.floor((now - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function greenhouseAverages(beds: BedSnapshot[]) {
  const num = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null);
    if (v.length === 0) return null;
    return v.reduce((s, x) => s + x, 0) / v.length;
  };
  return {
    soilMoisture: num(beds.map((b) => b.soilMoisture)),
    temperature: num(beds.map((b) => b.temperature)),
    humidity: num(beds.map((b) => b.humidity)),
    light: num(beds.map((b) => b.light)),
  };
}

export function fmt(n: number | null | undefined, digits: number): string {
  return n == null || Number.isNaN(n) ? "—" : n.toFixed(digits);
}
