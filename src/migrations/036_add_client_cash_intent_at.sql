-- Phase: Cash Payment Flow Correction
-- Track client cash intent separately from payment confirmation

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS client_cash_intent_at TIMESTAMP;
  