-- 044_create_expense_categories.sql
CREATE TABLE IF NOT EXISTS expense_categories (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                    VARCHAR(50) UNIQUE NOT NULL,
    name                    VARCHAR(100) NOT NULL,
    description             TEXT,
    default_debit_account_id UUID REFERENCES accounts(id),
    default_credit_account_id UUID REFERENCES accounts(id),
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);