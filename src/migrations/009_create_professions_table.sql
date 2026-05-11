CREATE TABLE IF NOT EXISTS professions (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(50) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  name_np     VARCHAR(100),
  icon        VARCHAR(10),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);