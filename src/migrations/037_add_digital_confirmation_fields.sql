-- Phase: Digital Payment Foundation
-- Add confirmation metadata columns (nullable, no impact on existing rows)

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS confirmed_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS confirmation_source VARCHAR(20);