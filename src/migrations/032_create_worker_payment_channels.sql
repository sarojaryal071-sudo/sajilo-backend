-- Phase 1: Worker Payment Channels
-- Workers attach eSewa, Khalti, IME Pay, bank accounts, etc.
CREATE TABLE IF NOT EXISTS worker_payment_channels (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL,          -- esewa, khalti, imepay, bank
  account_holder VARCHAR(100),
  account_number VARCHAR(100),
  qr_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_channels_worker ON worker_payment_channels(worker_id);