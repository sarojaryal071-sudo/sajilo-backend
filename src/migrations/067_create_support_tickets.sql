-- V067: Support ticket system – idempotent migration
CREATE TABLE IF NOT EXISTS support_tickets (
  id              SERIAL PRIMARY KEY,
  ticket_token    VARCHAR(12) NOT NULL UNIQUE,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  category        VARCHAR(30) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'open',
  priority        VARCHAR(10) NOT NULL DEFAULT 'normal',
  client_id       INTEGER NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Remove old schema columns if they exist
ALTER TABLE support_tickets DROP COLUMN IF EXISTS reporter_id;
ALTER TABLE support_tickets DROP COLUMN IF EXISTS reporter_role;
ALTER TABLE support_tickets DROP COLUMN IF EXISTS description;
ALTER TABLE support_tickets DROP COLUMN IF EXISTS assigned_admin;
ALTER TABLE support_tickets DROP COLUMN IF EXISTS resolution_note;

-- Add new columns if missing
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ticket_token VARCHAR(12);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES conversations(id);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'normal';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES users(id);

-- Fill tokens & enforce constraints
UPDATE support_tickets SET ticket_token = 'TKT-' || substring(md5(random()::text) from 1 for 6) WHERE ticket_token IS NULL;
ALTER TABLE support_tickets ALTER COLUMN ticket_token SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_ticket_token') THEN
    ALTER TABLE support_tickets ADD CONSTRAINT unique_ticket_token UNIQUE (ticket_token);
  END IF;
END;
$$;