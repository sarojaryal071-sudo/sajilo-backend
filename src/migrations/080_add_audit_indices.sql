-- V080: Add performance indices for audit queries (idempotent)

-- Entity lookup: "give me all logs for this specific entity"
CREATE INDEX IF NOT EXISTS idx_audit_entity
    ON audit_logs (entity_type, entity_id);

-- Severity-based filtering (used by dashboard lenses)
CREATE INDEX IF NOT EXISTS idx_audit_severity
    ON audit_logs (severity);