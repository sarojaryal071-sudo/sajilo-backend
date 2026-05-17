// sajilo-backend/src/modules/accounting/cashFlowTraceEngine.js
const { pool } = require('../../config/database');

async function getCashFlowTrace() {
  const { rows } = await pool.query(
    `SELECT
       ae.id,
       ae.amount,
       ae.debit_account,
       ae.credit_account,
       ae.entry_type,
       ae.ledger_entry_id,
       ae.expense_id,
       ae.journal_id,
       ae.created_at,
       CASE
         WHEN ae.credit_account = 'CASH' THEN 'INFLOW'
         WHEN ae.debit_account = 'CASH' THEN 'OUTFLOW'
       END AS direction,
       CASE
         WHEN ae.ledger_entry_id IS NOT NULL THEN fl.event_type
         WHEN ae.expense_id IS NOT NULL THEN 'EXPENSE'
         WHEN ae.journal_id IS NOT NULL THEN 'MANUAL_JOURNAL'
         ELSE 'UNKNOWN'
       END AS source_type
     FROM accounting_entries ae
     LEFT JOIN financial_ledger fl ON ae.ledger_entry_id = fl.id
     WHERE (ae.debit_account = 'CASH' OR ae.credit_account = 'CASH')
       AND ae.ledger_entry_id IS NOT NULL
        OR ae.expense_id IS NOT NULL
        OR ae.journal_id IS NOT NULL
     ORDER BY ae.created_at DESC
     LIMIT 200`
  );

  let totalInflow = 0;
  let totalOutflow = 0;
  const transactionTrace = [];

  for (const row of rows) {
    const amt = parseFloat(row.amount);
    if (row.direction === 'INFLOW') {
      totalInflow += amt;
    } else if (row.direction === 'OUTFLOW') {
      totalOutflow += amt;
    }
    transactionTrace.push({
      accounting_entry_id: row.id,
      amount: amt,
      direction: row.direction,
      source_type: row.source_type,
      source_detail: row.source_type === 'MANUAL_JOURNAL' ? 'Manual journal entry' :
                     row.source_type === 'EXPENSE' ? 'Expense payment' :
                     row.source_type === 'UNKNOWN' ? 'Unknown' : `Ledger: ${row.source_type}`,
      entry_type: row.entry_type,
      ledger_entry_id: row.ledger_entry_id,
      expense_id: row.expense_id,
      journal_id: row.journal_id,
      created_at: row.created_at,
    });
  }

  const netCashFlow = parseFloat((totalInflow - totalOutflow).toFixed(2));

  return {
    totalInflow: parseFloat(totalInflow.toFixed(2)),
    totalOutflow: parseFloat(totalOutflow.toFixed(2)),
    netCashFlow,
    transactionTrace,
  };
}

module.exports = { getCashFlowTrace };