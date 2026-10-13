import {
  MOCK_BEDS,
  MOCK_UPDATED_AT,
  formatUpdatedAt,
  greenhouseAverages,
  type BedSnapshot,
} from "./mockData";

const avg = greenhouseAverages(MOCK_BEDS);

function climateRows(bed: BedSnapshot | undefined) {
  const src = bed ?? {
    temperature: avg.temperature,
    humidity: avg.humidity,
    soilMoisture: avg.soilMoisture,
    light: avg.light,
  };
  return [
    { key: "temp", label: "Temp", value: src.temperature.toFixed(1), unit: "°C" },
    { key: "humidity", label: "Humidity", value: src.humidity.toFixed(0), unit: "%" },
    { key: "moisture", label: "Soil", value: src.soilMoisture.toFixed(1), unit: "%" },
    { key: "light", label: "Light", value: src.light.toFixed(0), unit: "lx" },
  ] as const;
}

type Props = {
  selectedBed: number | null;
  onSelectBed?: (bedId: number) => void;
};

export function Overlay({ selectedBed, onSelectBed }: Props) {
  const focus =
    selectedBed != null
      ? MOCK_BEDS.find((b) => b.bedId === selectedBed)
      : undefined;
  const climate = climateRows(focus);

  return (
    <div className="overlay">
      <header className="chrome-top">
        <div className="brand">
          <p className="brand-mark">Smart Greenhouse</p>
          <p className="brand-sub">
            {focus ? focus.name : "Live environment"}
            {!focus && (
              <span className="live-dot" aria-label="Live" title="Live" />
            )}
          </p>
        </div>

        <dl className="climate">
          {climate.map((m) => (
            <div key={m.key} className="climate-item">
              <dt>{m.label}</dt>
              <dd>
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
          {MOCK_BEDS.map((bed) => (
            <li key={bed.bedId}>
              <button
                type="button"
                className={
                  selectedBed === bed.bedId ? "bed is-active" : "bed"
                }
                onClick={() => onSelectBed?.(bed.bedId)}
              >
                <span className="bed-name">{bed.name}</span>
                <span className="bed-moisture">
                  {bed.soilMoisture.toFixed(1)}
                  <em>%</em>
                </span>
                <span className="bed-caption">moisture</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="updated">
          <span className="updated-dot" />
          Last updated {formatUpdatedAt(MOCK_UPDATED_AT)}
        </p>
      </footer>
    </div>
  );
}
