-- 041_create_account_mapping_rules_table.sql
-- Business event → debit/credit pair mapping

CREATE TABLE IF NOT EXISTS account_mapping_rules (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type     VARCHAR(50),                -- BOOKING_PAYMENT, PAYOUT, REFUND, COMMISSION, etc.
    debit_account  VARCHAR(50),
    credit_account VARCHAR(50),
    condition      JSONB,
    is_active      BOOLEAN DEFAULT TRUE
);