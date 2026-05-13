-- Phase 17.2: Document-Level Verification Review System
-- Table: verification_reviews
-- Stores per-document review decisions by admins

CREATE TABLE IF NOT EXISTS verification_reviews (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_id INTEGER NOT NULL REFERENCES worker_verifications(id) ON DELETE CASCADE,
  document_id INTEGER REFERENCES verification_documents(id) ON DELETE SET NULL,
  document_type VARCHAR(50),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  reason_code VARCHAR(50),
  reason_text TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_reviews_worker ON verification_reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_verification_reviews_verification ON verification_reviews(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_reviews_status ON verification_reviews(status);