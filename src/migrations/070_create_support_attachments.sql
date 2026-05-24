-- V071: Temporary support attachments (chat uploads)
CREATE TABLE IF NOT EXISTS support_attachments (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id      INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  uploaded_by     INTEGER NOT NULL REFERENCES users(id),
  attachment_type VARCHAR(20) NOT NULL DEFAULT 'image',  -- 'image', 'document'
  file_url        TEXT NOT NULL,
  public_id       VARCHAR(255),
  storage_provider VARCHAR(20) NOT NULL DEFAULT 'cloudinary',
  is_promoted_to_dispute BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);