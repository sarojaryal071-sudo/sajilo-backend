-- V069: Formal dispute cases – escalated from support tickets by admins
CREATE TABLE IF NOT EXISTS disputes (
  id                   SERIAL PRIMARY KEY,
  dispute_token        VARCHAR(12) NOT NULL UNIQUE,
  support_ticket_id    INTEGER NOT NULL REFERENCES support_tickets(id),
  client_id            INTEGER NOT NULL REFERENCES users(id),
  worker_id            INTEGER REFERENCES users(id),
  booking_id           INTEGER,
  category             VARCHAR(30) NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'open',  -- open, investigating, resolved, closed
  priority             VARCHAR(10) NOT NULL DEFAULT 'normal',
  support_note         TEXT,
  handled_by_admin_id  INTEGER REFERENCES users(id),
  handled_by_admin_name VARCHAR(100),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);