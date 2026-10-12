import {
  MOCK_BEDS,
  MOCK_UPDATED_AT,
  formatUpdatedAt,
  greenhouseAverages,
} from "./mockData";

const avg = greenhouseAverages(MOCK_BEDS);

const CLIMATE = [
  { key: "temp", label: "Temp", value: avg.temperature.toFixed(1), unit: "°C" },
  { key: "humidity", label: "Humidity", value: avg.humidity.toFixed(0), unit: "%" },
  { key: "moisture", label: "Soil", value: avg.soilMoisture.toFixed(1), unit: "%" },
  { key: "light", label: "Light", value: avg.light.toFixed(0), unit: "lx" },
] as const;

type Props = {
  selectedBed: number | null;
};

export function Overlay({ selectedBed }: Props) {
  const focus =
    selectedBed != null
      ? MOCK_BEDS.find((b) => b.bedId === selectedBed)
      : undefined;

  return (
    <div className="overlay">
      <header className="chrome-top">
        <div className="brand">
          <p className="brand-mark">Smart Greenhouse</p>
          <p className="brand-sub">Live environment</p>
        </div>

        <dl className="climate">
          {CLIMATE.map((m) => (
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

      <div className="chrome-mid">
        {focus && (
          <p className="focus-line">
            <span>{focus.name}</span>
            {focus.temperature.toFixed(1)}°C · {focus.humidity.toFixed(0)}% RH ·{" "}
            {focus.light.toFixed(0)} lx · {focus.soilMoisture.toFixed(0)}% soil
          </p>
        )}
      </div>

      <footer className="chrome-bottom">
        <ul className="beds">
          {MOCK_BEDS.map((bed) => (
            <li
              key={bed.bedId}
              className={
                selectedBed === bed.bedId ? "bed is-active" : "bed"
              }
            >
              <span className="bed-name">{bed.name}</span>
              <span className="bed-moisture">
                {bed.soilMoisture.toFixed(1)}
                <em>%</em>
              </span>
              <span className="bed-caption">moisture</span>
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
