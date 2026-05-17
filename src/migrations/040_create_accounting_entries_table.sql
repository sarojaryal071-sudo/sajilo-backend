-- 040_create_accounting_entries_table.sql
-- Double-entry records, loosely linked to ledger entries (no FK enforced)

CREATE TABLE IF NOT EXISTS accounting_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_entry_id UUID,                       -- optional reference, no FK
    debit_account   VARCHAR(50) NOT NULL,
    credit_account  VARCHAR(50) NOT NULL,
    amount          NUMERIC(12,2) NOT NULL,
    currency        VARCHAR(10) DEFAULT 'NPR',
    reference_type  VARCHAR(50),                -- booking | payment | payout | refund | adjustment | dispute
    reference_id    UUID,
    remarks         TEXT,
    entry_type      VARCHAR(20) DEFAULT 'AUTO', -- AUTO | MANUAL
    created_by      UUID,
    created_at      TIMESTAMP DEFAULT NOW()
);