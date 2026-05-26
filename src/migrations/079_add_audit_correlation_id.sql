-- V079: Add correlation_id to audit_logs for workflow tracing (idempotent)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS correlation_id UUID;
CREATE INDEX IF NOT EXISTS idx_audit_correlation ON audit_logs (correlation_id);