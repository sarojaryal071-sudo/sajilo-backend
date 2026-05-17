// sajilo-backend/src/modules/accounting/manualJournalService.js
const { pool } = require('../../config/database');
const { validateAccount } = require('./accountRegistry');
const crypto = require('crypto');

/**
 * Create a manual journal entry (append‑only, entry_type = 'MANUAL').
 * Does NOT trigger automation hooks.
 */
async function createManualJournalEntry({
  debit_account,
  credit_account,
  amount,
  currency = 'NPR',
  remarks = '',
  reference_type = 'manual_adjustment',
  reference_id = null,
  created_by,   // admin user UUID
}) {
  // Validation
  if (!debit_account || !credit_account) {
    throw new Error('debit_account and credit_account are required');
  }
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    throw new Error('Amount must be a positive number');
  }

  // Ensure accounts exist (throws if not)
  await validateAccount(debit_account);
  await validateAccount(credit_account);

  // Generate a fresh UUID for this journal entry (id = journal_id)
  const journalId = crypto.randomUUID();

  // Insert directly – entry_type forced to MANUAL, no ledger link
  const result = await pool.query(
    `INSERT INTO accounting_entries
       (id, journal_id, debit_account, credit_account, amount, currency, reference_type, reference_id, remarks, entry_type, created_by)
     VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [journalId, debit_account, credit_account, amt, currency, reference_type, reference_id, remarks, created_by]
  );
  return result.rows[0];
}

/**
 * List all manual journal entries (most recent first).
 */
async function listManualEntries(limit = 50) {
  const result = await pool.query(
    `SELECT * FROM accounting_entries
     WHERE entry_type = 'MANUAL'
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Fetch a single manual entry by ID.
 */
async function getManualEntryById(id) {
  const result = await pool.query(
    `SELECT * FROM accounting_entries
     WHERE id = $1 AND entry_type = 'MANUAL'`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  createManualJournalEntry,
  listManualEntries,
  getManualEntryById,
};