-- V002: Adds future-proof metadata columns to conversations
-- Prepares for: priority routing, ticket system, status tracking
-- Safe: all columns have defaults, nullable where appropriate

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_type TEXT NOT NULL DEFAULT 'customer_admin';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS support_ticket_id INTEGER NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS context_id INTEGER NULL;