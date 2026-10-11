CREATE TABLE beds (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE readings (
  id bigserial PRIMARY KEY,
  bed_id integer NOT NULL REFERENCES beds (id),
  soil_moisture real,
  temperature real,
  humidity real,
  light real,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE watering_events (
  id bigserial PRIMARY KEY,
  bed_id integer NOT NULL REFERENCES beds (id),
  started_at timestamptz NOT NULL,
  duration_s integer NOT NULL CHECK (duration_s > 0),
  trigger text NOT NULL CHECK (trigger IN ('auto', 'manual'))
);

CREATE TABLE settings (
  bed_id integer PRIMARY KEY REFERENCES beds (id),
  moisture_threshold real NOT NULL,
  max_duration_s integer NOT NULL,
  min_interval_min integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pending_actions (
  id bigserial PRIMARY KEY,
  bed_id integer NOT NULL UNIQUE REFERENCES beds (id),
  duration_s integer NOT NULL CHECK (duration_s > 0),
  trigger text NOT NULL CHECK (trigger IN ('auto', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX readings_bed_id_recorded_at_desc_idx
  ON readings (bed_id, recorded_at DESC);

CREATE INDEX watering_events_bed_id_started_at_desc_idx
  ON watering_events (bed_id, started_at DESC);
