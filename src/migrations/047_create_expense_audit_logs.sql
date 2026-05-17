-- 047_create_expense_audit_logs.sql
CREATE TABLE IF NOT EXISTS expense_audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id    UUID NOT NULL REFERENCES expenses(id),
    action_type   VARCHAR(30) NOT NULL,  -- CREATE | UPDATE | STATUS_CHANGE | APPROVE | PAY
    old_value     JSONB,
    new_value     JSONB,
    performed_by  UUID,
    created_at    TIMESTAMP DEFAULT NOW()
);