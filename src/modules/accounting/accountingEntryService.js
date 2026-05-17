// sajilo-backend/src/modules/accounting/accountingEntryService.js
const { pool } = require('../../config/database');
const { validateAccount } = require('./accountRegistry');
const { validateSource } = require('./accountingSourceValidator');

async function createAccountingEntry(entry) {
  try {
    await validateAccount(entry.debit_account);
    await validateAccount(entry.credit_account);

    // Source traceability enforcement
    const sourceCheck = validateSource(entry);
    if (!sourceCheck.valid) {
      console.warn('[ACCOUNTING] Skipping orphan entry insert:', entry);
      return null;
    }

    const result = await pool.query(
      `INSERT INTO accounting_entries
         (ledger_entry_id, expense_id, journal_id, debit_account, credit_account, amount, currency,
          reference_type, reference_id, remarks, entry_type, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        entry.ledger_entry_id || null,
        entry.expense_id || null,
        entry.journal_id || null,
        entry.debit_account,
        entry.credit_account,
        entry.amount,
        entry.currency || 'NPR',
        entry.reference_type || null,
        entry.reference_id || null,
        entry.remarks || '',
        entry.entry_type || 'AUTO',
        entry.created_by || null,
      ]
    );
    return result.rows[0];
  } catch (err) {
    console.error('[ACCOUNTING ERROR] Failed to create entry', err);
    return null;
  }
}
async function bulkCreateAccountingEntries(entries) {
  const results = [];
  for (const entry of entries) {
    const res = await createAccountingEntry(entry);
    if (res) results.push(res);
  }
  return results;
}

module.exports = { createAccountingEntry, bulkCreateAccountingEntries };