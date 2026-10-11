INSERT INTO beds (name) VALUES
  ('Bed 1'),
  ('Bed 2'),
  ('Bed 3')
ON CONFLICT (name) DO NOTHING;

INSERT INTO settings (bed_id, moisture_threshold, max_duration_s, min_interval_min)
SELECT b.id, 30.0, 120, 60
FROM beds b
WHERE b.name IN ('Bed 1', 'Bed 2', 'Bed 3')
ON CONFLICT (bed_id) DO NOTHING;
