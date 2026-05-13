-- Phase 17: Worker Verification System
-- Table: verification_documents
-- Stores uploaded document references (not the files themselves)

CREATE TABLE IF NOT EXISTS verification_documents (
  id SERIAL PRIMARY KEY,
  verification_id INTEGER NOT NULL REFERENCES worker_verifications(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  original_filename VARCHAR(255),
  file_size_bytes INTEGER,
  mime_type VARCHAR(50),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_docs_verification ON verification_documents(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_docs_type ON verification_documents(document_type);