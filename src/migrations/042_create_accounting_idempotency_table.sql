-- 043_create_accounting_idempotency_table.sql
-- Prevents duplicate accounting entries from the same source event

CREATE TABLE IF NOT EXISTS accounting_idempotency (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL,   -- 'ledger' | 'manual' | 'system'
    source_id   UUID,
    event_type  VARCHAR(50),
    hash        TEXT UNIQUE NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);