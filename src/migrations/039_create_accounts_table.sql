-- 039_create_accounts_table.sql
-- Foundation chart of accounts

CREATE TABLE IF NOT EXISTS accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL,
    type        VARCHAR(50) NOT NULL CHECK (type IN ('ASSET','LIABILITY','INCOME','EXPENSE','EQUITY')),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);