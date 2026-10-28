import { useEffect, useState, type ReactNode } from "react";
import {
  formatUpdatedAt,
  fmt,
  greenhouseAverages,
  type BedSnapshot,
} from "./mockData";

function climateRows(bed: BedSnapshot | undefined, beds: BedSnapshot[]) {
  const avg = greenhouseAverages(beds);
  const src = bed ?? {
    temperature: avg.temperature,
    humidity: avg.humidity,
    soilMoisture: avg.soilMoisture,
    light: avg.light,
  };
  return [
    { key: "temp", label: "Temp", value: fmt(src.temperature, 1), unit: "°C" },
    { key: "humidity", label: "Humidity", value: fmt(src.humidity, 0), unit: "%" },
    { key: "moisture", label: "Soil", value: fmt(src.soilMoisture, 1), unit: "%" },
    { key: "light", label: "Light", value: fmt(src.light, 0), unit: "lx" },
  ] as const;
}

type Props = {
  beds: BedSnapshot[];
  updatedAt: Date | null;
  selectedBed: number | null;
  onSelectBed?: (bedId: number) => void;
  onResetView?: () => void;
  children?: ReactNode;
};

export function Overlay({
  beds,
  updatedAt,
  selectedBed,
  onSelectBed,
  onResetView,
  children,
}: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!updatedAt) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [updatedAt]);

  const focus =
    selectedBed != null
      ? beds.find((b) => b.bedId === selectedBed)
      : undefined;
  const climate = climateRows(focus, beds);
  // Remount values when a new reading lands → CSS fade-in
  const dataKey = updatedAt?.getTime() ?? 0;

  return (
    <div className="overlay">
      <header className="chrome-top">
        <div className="chrome-lead">
          <div className="brand">
            <button
              type="button"
              className="brand-mark"
              onClick={onResetView}
              title="Reset view"
            >
              Smart Greenhouse
            </button>
            <p className="brand-sub">
              {focus ? focus.name : "Live environment"}
              {!focus && (
                <span className="live-dot" aria-label="Live" title="Live" />
              )}
            </p>
          </div>
          {children}
        </div>

        <dl className="climate">
          {climate.map((m) => (
            <div key={m.key} className="climate-item">
              <dt>{m.label}</dt>
              <dd key={dataKey} className="telemetry-in">
                {m.value}
                <em>{m.unit}</em>
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="chrome-mid" />

      <footer className="chrome-bottom">
        <ul className="beds">
          {beds.map((bed) => (
            <li key={bed.bedId}>
              <button
                type="button"
                className={
                  selectedBed === bed.bedId ? "bed is-active" : "bed"
                }
                onClick={() => onSelectBed?.(bed.bedId)}
              >
                <span className="bed-name">{bed.name}</span>
                <span key={dataKey} className="bed-moisture telemetry-in">
                  {fmt(bed.soilMoisture, 1)}
                  <em>%</em>
                </span>
                <span className="bed-caption">Soil moisture</span>
              </button>
            </li>
          ))}
        </ul>

        <p key={dataKey} className="updated telemetry-in">
          <span className="updated-dot" />
          {updatedAt
            ? `Last updated ${formatUpdatedAt(updatedAt)}`
            : "No readings yet"}
        </p>
      </footer>
    </div>
  );
}
