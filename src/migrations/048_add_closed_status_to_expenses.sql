-- 048_add_closed_status_to_expenses.sql
ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_status_check;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_status_check
  CHECK (status IN ('draft','pending','approved','paid','cancelled','closed'));