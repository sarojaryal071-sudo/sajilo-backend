-- Phase: Payment Intelligence Layer
-- Add tracking timestamps without new payment statuses

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_intent_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS payment_settlement_mode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payment_settled_at TIMESTAMP;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_initiated_at TIMESTAMP;