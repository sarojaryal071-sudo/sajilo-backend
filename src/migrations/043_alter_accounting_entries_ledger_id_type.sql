-- 043_alter_accounting_entries_ledger_id_type.sql
-- Change ledger_entry_id from UUID to BIGINT to match financial_ledger.id

ALTER TABLE accounting_entries
  ALTER COLUMN ledger_entry_id TYPE BIGINT USING ledger_entry_id::text::bigint;