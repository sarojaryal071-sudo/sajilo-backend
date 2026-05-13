-- 026_create_automation_logs.sql
-- Phase 13D – Automation Logs

CREATE TABLE IF NOT EXISTS automation_logs (
  id              SERIAL PRIMARY KEY,
  automation_key  VARCHAR(100) NOT NULL,          -- matches AUTOMATION_JOBS id
  status          VARCHAR(20) NOT NULL,           -- 'success' or 'failure'
  entity_type     VARCHAR(50),
  entity_id       INTEGER,
  error_message   TEXT,
  metadata        JSONB,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_automation_key ON automation_logs (automation_key, started_at DESC);