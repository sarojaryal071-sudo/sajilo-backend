-- 051_extend_expenses_with_cost_center_and_type.sql
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS cost_center_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS expense_type VARCHAR(50);