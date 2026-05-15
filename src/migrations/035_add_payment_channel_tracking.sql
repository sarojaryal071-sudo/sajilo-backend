-- Phase: Payment Channel Intelligence
-- Track which channel/provider the client selects, without changing payment status

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_channel_id INTEGER,
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(payment_provider);
CREATE INDEX IF NOT EXISTS idx_payments_channel ON payments(payment_channel_id);