CREATE TABLE IF NOT EXISTS worker_professions (
  id              SERIAL PRIMARY KEY,
  worker_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profession_id   INTEGER NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, profession_id)
);