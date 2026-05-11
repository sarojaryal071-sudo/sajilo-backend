CREATE TABLE IF NOT EXISTS profession_services (
  id              SERIAL PRIMARY KEY,
  profession_id   INTEGER NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  label           VARCHAR(150) NOT NULL,
  label_np        VARCHAR(150),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);