-- 025_create_platform_policies.sql
-- Module 2 – Operational Policy Engine

CREATE TABLE IF NOT EXISTS platform_policies (
  key         VARCHAR(100) PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);