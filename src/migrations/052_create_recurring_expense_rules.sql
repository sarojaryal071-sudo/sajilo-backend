-- 052_create_recurring_expense_rules.sql
CREATE TABLE IF NOT EXISTS recurring_expense_rules (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(150) NOT NULL,
    vendor_id         UUID REFERENCES vendors(id),
    category_id       UUID REFERENCES expense_categories(id),
    cost_center_code  VARCHAR(50) NOT NULL,
    expense_type      VARCHAR(50) NOT NULL DEFAULT 'RECURRING',
    recurrence_type   VARCHAR(20) NOT NULL CHECK (recurrence_type IN ('DAILY','WEEKLY','MONTHLY','YEARLY')),
    interval_value    INT DEFAULT 1,
    amount_type       VARCHAR(20) NOT NULL CHECK (amount_type IN ('FIXED','PERCENTAGE')),
    amount_value      NUMERIC(12,2) NOT NULL,
    is_active         BOOLEAN DEFAULT TRUE,
    last_generated_at TIMESTAMP NULL,
    created_at        TIMESTAMP DEFAULT NOW()
);