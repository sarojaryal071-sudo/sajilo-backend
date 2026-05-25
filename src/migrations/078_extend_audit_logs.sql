-- V078: Extend audit_logs for operational governance
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_client_id VARCHAR(20);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_name      VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role_id  INTEGER REFERENCES roles(id);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_label   VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason         TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address     VARCHAR(45);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent     TEXT;