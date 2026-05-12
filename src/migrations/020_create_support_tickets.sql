-- 020_create_support_tickets.sql
-- Phase 13B – Support & Ticket System

CREATE TABLE IF NOT EXISTS support_tickets (
  id              SERIAL PRIMARY KEY,
  reporter_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reporter_role   VARCHAR(20) NOT NULL,          -- 'worker' or 'customer'
  category        VARCHAR(30) NOT NULL,          -- 'payment', 'worker_behavior', 'client_behavior', 'booking_issue', 'technical_issue'
  description     TEXT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'open',   -- 'open', 'investigating', 'resolved', 'closed'
  assigned_admin  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_reporter ON support_tickets (reporter_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status   ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON support_tickets (category);