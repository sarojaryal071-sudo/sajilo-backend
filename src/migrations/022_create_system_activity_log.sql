-- 022_create_system_activity_log.sql
-- Phase 13B – Activity Timeline System

CREATE TABLE IF NOT EXISTS system_activity_log (
  id          SERIAL PRIMARY KEY,
  type        VARCHAR(30) NOT NULL,          -- booking, payment, user, admin, system, moderation, ticket
  action      VARCHAR(30) NOT NULL,          -- created, updated, deleted, completed, failed
  entity_type VARCHAR(30),                   -- booking, payment, user, ticket, etc.
  entity_id   INTEGER,
  title       VARCHAR(255) NOT NULL,
  metadata    JSONB,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_type ON system_activity_log (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON system_activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON system_activity_log (created_at DESC);