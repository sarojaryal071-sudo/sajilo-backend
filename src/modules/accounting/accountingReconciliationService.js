// sajilo-backend/src/modules/accounting/accountingReconciliationService.js
const { pool } = require('../../config/database');

async function compareLedgerVsAccounting() {
  const ledgerEntries = await pool.query(
    `SELECT id, event_type, amount FROM financial_ledger
     WHERE event_type IN ('invoice_finalized', 'payment_confirmed', 'commission_settled')
     ORDER BY created_at DESC LIMIT 200`
  );

  const accountingEntries = await pool.query(
    `SELECT ledger_entry_id, amount FROM accounting_entries
     WHERE entry_type IN ('AUTO', 'AUTO_BACKFILL') AND ledger_entry_id IS NOT NULL`
  );

  console.log('[RECONCILIATION] accounting rows:', accountingEntries.rows.length);

  const accountingMap = new Map();
  accountingEntries.rows.forEach(ae => {
    accountingMap.set(String(ae.ledger_entry_id), parseFloat(ae.amount));
  });

  const missing = [];
  const mismatched = [];

  ledgerEntries.rows.forEach(le => {
    const accAmount = accountingMap.get(String(le.id));
    if (accAmount === undefined) {
      missing.push({ ledger_id: le.id, event_type: le.event_type, amount: parseFloat(le.amount) });
    } else if (Math.abs(accAmount - parseFloat(le.amount)) > 0.001) {
      mismatched.push({ ledger_id: le.id, event_type: le.event_type, ledger_amount: parseFloat(le.amount), accounting_amount: accAmount });
    }
  });

  return { missing, mismatched };
}

module.exports = { compareLedgerVsAccounting };