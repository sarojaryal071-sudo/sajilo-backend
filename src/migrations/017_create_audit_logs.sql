-- 017_create_audit_logs.sql
-- Phase 12G – Audit & System Logs

CREATE TABLE IF NOT EXISTS audit_logs (
  id              SERIAL PRIMARY KEY,
  actor_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_role      VARCHAR(20) NOT NULL,            -- 'admin', 'worker', 'customer', 'system'
  action          VARCHAR(50) NOT NULL,            -- e.g. 'payment.status_change', 'admin.config_update'
  entity_type     VARCHAR(50),                     -- 'booking', 'payment', 'user', 'config', etc.
  entity_id       INTEGER,
  old_value       JSONB,                           -- snapshot before change
  new_value       JSONB,                           -- snapshot after change
  metadata        JSONB,                           -- any extra context (IP, reason, etc.)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast filtering by actor or action
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs (actor_id, actor_role);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action, entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);