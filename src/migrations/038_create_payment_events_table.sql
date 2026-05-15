-- Phase 2A: Payment Timeline Infrastructure
-- Append-only operational event log for every booking/payment action.
-- This table OBSERVES existing flows; it does NOT drive payment logic.

CREATE TABLE IF NOT EXISTS payment_events (
  id SERIAL PRIMARY KEY,

  booking_id INTEGER NOT NULL
    REFERENCES bookings(id) ON DELETE CASCADE,

  payment_id INTEGER
    REFERENCES payments(id) ON DELETE SET NULL,

  event_type VARCHAR(64) NOT NULL,

  performed_by_role VARCHAR(32),

  performed_by_id INTEGER,

  provider VARCHAR(64),

  notes TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient timeline retrieval
CREATE INDEX IF NOT EXISTS idx_payment_events_booking
  ON payment_events(booking_id, created_at);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment
  ON payment_events(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_events_type
  ON payment_events(event_type);