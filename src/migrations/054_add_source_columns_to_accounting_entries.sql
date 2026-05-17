-- 054_add_source_columns_to_accounting_entries.sql
ALTER TABLE accounting_entries
ADD COLUMN IF NOT EXISTS expense_id UUID,
ADD COLUMN IF NOT EXISTS journal_id UUID;