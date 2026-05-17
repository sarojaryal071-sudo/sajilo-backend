-- 050_create_expense_classification_rules.sql
CREATE TABLE IF NOT EXISTS expense_classification_rules (
    id                SERIAL PRIMARY KEY,
    category_id       UUID REFERENCES expense_categories(id),
    vendor_id         UUID REFERENCES vendors(id),
    keyword           TEXT,
    expense_type      VARCHAR(50) NOT NULL,
    cost_center_code  VARCHAR(50) NOT NULL,
    is_recurring      BOOLEAN DEFAULT FALSE,
    priority          INT DEFAULT 1,
    created_at        TIMESTAMP DEFAULT NOW()
);