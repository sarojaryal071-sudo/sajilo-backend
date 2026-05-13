-- Phase 17: Worker Verification System
-- Table: worker_verifications
-- Tracks verification lifecycle for each worker

CREATE TABLE IF NOT EXISTS worker_verifications (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id),
  rejection_reason VARCHAR(50),
  rejection_note TEXT,
  verified_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- One active verification per worker
  CONSTRAINT unique_worker_verification UNIQUE (worker_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_verifications_status ON worker_verifications(status);
CREATE INDEX IF NOT EXISTS idx_worker_verifications_worker ON worker_verifications(worker_id);