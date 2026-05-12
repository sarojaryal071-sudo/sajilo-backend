CREATE TABLE IF NOT EXISTS worker_job_size_ranges (
  id                SERIAL PRIMARY KEY,
  worker_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  small_max_price   DECIMAL(10,2) NOT NULL DEFAULT 1000,
  medium_max_price  DECIMAL(10,2) NOT NULL DEFAULT 3000,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);