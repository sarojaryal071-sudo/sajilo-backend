-- V071: Permanent dispute evidence (escalated from support attachments)
CREATE TABLE IF NOT EXISTS dispute_evidences (
  id                   SERIAL PRIMARY KEY,
  dispute_id           INTEGER NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  source_attachment_id INTEGER REFERENCES support_attachments(id) ON DELETE SET NULL,
  uploaded_by          INTEGER NOT NULL REFERENCES users(id),
  file_url             TEXT NOT NULL,
  public_id            VARCHAR(255),
  evidence_type        VARCHAR(20) NOT NULL DEFAULT 'image',  -- 'image', 'document'
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);