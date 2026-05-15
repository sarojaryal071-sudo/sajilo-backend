-- 005_create_payments_table.sql
-- Phase 8: Payment & Billing Foundation

CREATE TABLE IF NOT EXISTS payments (
  id              SERIAL PRIMARY KEY,
  payment_id      UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  booking_id      INTEGER NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  customer_id     INTEGER NOT NULL,
  worker_id       INTEGER NOT NULL,
  method          VARCHAR(30) NOT NULL DEFAULT 'cash',
  status          VARCHAR(40) NOT NULL DEFAULT 'unpaid',
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
  platform_fee    DECIMAL(10,2) NOT NULL DEFAULT 0,
  worker_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency        VARCHAR(10) NOT NULL DEFAULT 'NPR',
  invoice_number  VARCHAR(30),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast booking lookups
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_worker_id ON payments(worker_id);