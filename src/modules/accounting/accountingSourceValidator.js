// sajilo-backend/src/modules/accounting/accountingSourceValidator.js

/**
 * Check that at least one source identifier is present.
 * Returns { valid: boolean, entry: object }
 */
function validateSource(entry) {
  const hasLedger = entry.ledger_entry_id !== null && entry.ledger_entry_id !== undefined;
  const hasExpense = entry.expense_id !== null && entry.expense_id !== undefined;
  const hasJournal = entry.journal_id !== null && entry.journal_id !== undefined;

  const valid = hasLedger || hasExpense || hasJournal;
  if (!valid) {
    console.warn('[ACCOUNTING] ORPHAN_ACCOUNTING_ENTRY_DETECTED', entry);
  }
  return { valid, entry };
}

module.exports = { validateSource };