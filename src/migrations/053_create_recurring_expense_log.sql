-- 053_create_recurring_expense_log.sql
CREATE TABLE IF NOT EXISTS recurring_expense_log (
    id                  SERIAL PRIMARY KEY,
    rule_id             INT NOT NULL REFERENCES recurring_expense_rules(id),
    generated_expense_id UUID REFERENCES expenses(id),
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    hash                VARCHAR(255) UNIQUE NOT NULL,
    created_at          TIMESTAMP DEFAULT NOW()
);