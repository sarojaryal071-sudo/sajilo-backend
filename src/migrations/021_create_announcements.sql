-- 021_create_announcements.sql
-- Phase 13B – Platform Announcements

CREATE TABLE IF NOT EXISTS announcements (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  message       TEXT NOT NULL,
  target_roles  TEXT[] NOT NULL DEFAULT '{worker,customer}',   -- who sees it
  is_dismissible BOOLEAN NOT NULL DEFAULT true,
  expires_at    TIMESTAMPTZ,                                   -- optional expiry
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_expiry ON announcements (expires_at);