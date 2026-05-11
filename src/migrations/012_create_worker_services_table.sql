CREATE TABLE IF NOT EXISTS worker_services (
  id              SERIAL PRIMARY KEY,
  worker_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profession_id   INTEGER NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  service_id      INTEGER REFERENCES profession_services(id) ON DELETE CASCADE,
  custom_label    VARCHAR(150),
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, profession_id, service_id)
);