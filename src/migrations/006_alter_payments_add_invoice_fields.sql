-- 006_alter_payments_add_invoice_fields.sql
-- Phase 8 (enhanced): Add editable invoice fields

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS extra_items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS final_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS invoice_confirmed_at TIMESTAMPTZ;