DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'worker_job_size_ranges_worker_id_key'
      AND conrelid = 'worker_job_size_ranges'::regclass
  ) THEN
    ALTER TABLE worker_job_size_ranges DROP CONSTRAINT worker_job_size_ranges_worker_id_key;
  END IF;
END $$;

ALTER TABLE worker_job_size_ranges
  ADD COLUMN IF NOT EXISTS profession_id INTEGER REFERENCES professions(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_range_fallback
  ON worker_job_size_ranges (worker_id) WHERE profession_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_range_profession
  ON worker_job_size_ranges (worker_id, profession_id) WHERE profession_id IS NOT NULL;