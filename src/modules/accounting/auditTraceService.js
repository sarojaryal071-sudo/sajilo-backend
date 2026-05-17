// sajilo-backend/src/modules/accounting/auditTraceService.js
const { pool } = require('../../config/database');

async function getAuditTrace(accountingEntryId) {
  // 1. Fetch the accounting entry
  const aeResult = await pool.query(
    `SELECT * FROM accounting_entries WHERE id = $1`,
    [accountingEntryId]
  );
  if (aeResult.rows.length === 0) return null;
  const accountingEntry = aeResult.rows[0];

  const trace = {
    accountingEntry,
    linkedEntities: {},
    timeline: [],
  };

  // 2. If linked to a ledger entry, fetch it
  if (accountingEntry.ledger_entry_id) {
    const leResult = await pool.query(
      `SELECT * FROM financial_ledger WHERE id = $1`,
      [accountingEntry.ledger_entry_id]
    );
    if (leResult.rows.length > 0) {
      trace.linkedEntities.ledgerEntry = leResult.rows[0];
      trace.timeline.push({
        type: 'LEDGER_ENTRY',
        id: leResult.rows[0].id,
        amount: parseFloat(leResult.rows[0].amount),
        eventType: leResult.rows[0].event_type,
        createdAt: leResult.rows[0].created_at,
      });
    }
  }

  // 3. If linked to an expense, fetch it
  if (accountingEntry.expense_id) {
    const expResult = await pool.query(
      `SELECT * FROM expenses WHERE id = $1`,
      [accountingEntry.expense_id]
    );
    if (expResult.rows.length > 0) {
      trace.linkedEntities.expense = expResult.rows[0];
      trace.timeline.push({
        type: 'EXPENSE',
        id: expResult.rows[0].id,
        amount: parseFloat(expResult.rows[0].amount),
        status: expResult.rows[0].status,
        createdAt: expResult.rows[0].created_at,
      });
    }
  }

  // 4. If this is a manual journal, journal_id = id; include that context
  if (accountingEntry.journal_id && accountingEntry.entry_type === 'MANUAL') {
    trace.linkedEntities.manualJournal = {
      id: accountingEntry.journal_id,
      debitAccount: accountingEntry.debit_account,
      creditAccount: accountingEntry.credit_account,
      amount: parseFloat(accountingEntry.amount),
      remarks: accountingEntry.remarks,
      createdAt: accountingEntry.created_at,
    };
    trace.timeline.push({
      type: 'MANUAL_JOURNAL',
      id: accountingEntry.journal_id,
      amount: parseFloat(accountingEntry.amount),
      createdAt: accountingEntry.created_at,
    });
  }

  // Sort timeline by date ascending
  trace.timeline.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return trace;
}

module.exports = { getAuditTrace };