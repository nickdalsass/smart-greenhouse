/** Stand-in telemetry until the API is wired. */
export type BedSnapshot = {
  bedId: number;
  name: string;
  soilMoisture: number;
  temperature: number;
  humidity: number;
  light: number;
};

export const MOCK_BEDS: BedSnapshot[] = [
  {
    bedId: 1,
    name: "Left bed",
    soilMoisture: 34.8,
    temperature: 21.6,
    humidity: 58.2,
    light: 395,
  },
  {
    bedId: 2,
    name: "Back bed",
    soilMoisture: 27.4,
    temperature: 22.1,
    humidity: 61.0,
    light: 420,
  },
  {
    bedId: 3,
    name: "Right bed",
    soilMoisture: 19.2,
    temperature: 22.8,
    humidity: 64.5,
    light: 448,
  },
];

export const MOCK_UPDATED_AT = new Date(Date.now() - 2 * 60 * 1000);

export function formatUpdatedAt(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function greenhouseAverages(beds: BedSnapshot[]) {
  const n = beds.length;
  return {
    soilMoisture: beds.reduce((s, b) => s + b.soilMoisture, 0) / n,
    temperature: beds.reduce((s, b) => s + b.temperature, 0) / n,
    humidity: beds.reduce((s, b) => s + b.humidity, 0) / n,
    light: beds.reduce((s, b) => s + b.light, 0) / n,
  };
}
