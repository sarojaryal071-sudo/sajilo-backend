// sajilo-backend/src/modules/accounting/reconciliationEngine.js
const { pool } = require('../../config/database');

async function reconcileLedgerVsAccounting() {
  // Ledger entries that should have accounting counterparts
  const ledgerEntries = await pool.query(
    `SELECT id, event_type, amount FROM financial_ledger
     WHERE event_type IN ('invoice_finalized', 'payment_confirmed', 'commission_settled')
     ORDER BY created_at DESC`
  );

  // Accounting entries linked to ledger entries
  const accountingEntries = await pool.query(
    `SELECT id, ledger_entry_id, amount, entry_type FROM accounting_entries
     WHERE ledger_entry_id IS NOT NULL`
  );

  const accountingMap = new Map();
  for (const ae of accountingEntries.rows) {
    accountingMap.set(String(ae.ledger_entry_id), ae);
  }

  const matched = [];
  const missingAccounting = [];
  const mismatched = [];

  for (const le of ledgerEntries.rows) {
    const ae = accountingMap.get(String(le.id));
    if (ae) {
      const ledgerAmt = parseFloat(le.amount);
      const accAmt = parseFloat(ae.amount);
      if (Math.abs(accAmt - ledgerAmt) > 0.001) {
        mismatched.push({
          ledger_id: le.id,
          event_type: le.event_type,
          ledger_amount: ledgerAmt,
          accounting_amount: accAmt,
          accounting_entry_id: ae.id,
        });
      } else {
        matched.push({
          ledger_id: le.id,
          event_type: le.event_type,
          amount: ledgerAmt,
          accounting_entry_id: ae.id,
        });
      }
    } else {
      missingAccounting.push({
        ledger_id: le.id,
        event_type: le.event_type,
        amount: parseFloat(le.amount),
      });
    }
  }

  // Orphan accounting: accounting entries pointing to a non-existent ledger entry
  const ledgerIdSet = new Set(ledgerEntries.rows.map(le => String(le.id)));
  const orphanAccounting = accountingEntries.rows
    .filter(ae => !ledgerIdSet.has(String(ae.ledger_entry_id)))
    .map(ae => ({
      accounting_entry_id: ae.id,
      ledger_entry_id: ae.ledger_entry_id,
      amount: parseFloat(ae.amount),
      entry_type: ae.entry_type,
    }));

  return {
    matchedCount: matched.length,
    missingAccountingCount: missingAccounting.length,
    orphanAccountingCount: orphanAccounting.length,
    mismatchedCount: mismatched.length,
    matched: matched.slice(0, 50),
    missingAccounting: missingAccounting.slice(0, 50),
    orphanAccounting: orphanAccounting.slice(0, 50),
    mismatched: mismatched.slice(0, 50),
  };
}

module.exports = { reconcileLedgerVsAccounting };