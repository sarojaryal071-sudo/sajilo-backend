-- V072: Admin assignment for support tickets + system message flag
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_admin_id INTEGER REFERENCES users(id);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_admin_name VARCHAR(100);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_admin_role VARCHAR(50);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;