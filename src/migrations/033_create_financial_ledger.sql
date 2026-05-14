-- Phase: Financial Ledger Foundation
-- Append-only accounting ledger – runs in parallel with payments table
-- DO NOT replace payments; this is the audit/accounting layer

CREATE TABLE IF NOT EXISTS financial_ledger (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  worker_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(60) NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'NPR',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by_role VARCHAR(30),
  created_by_user INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_booking ON financial_ledger(booking_id);
CREATE INDEX IF NOT EXISTS idx_ledger_worker ON financial_ledger(worker_id);
CREATE INDEX IF NOT EXISTS idx_ledger_event ON financial_ledger(event_type);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON financial_ledger(created_at);