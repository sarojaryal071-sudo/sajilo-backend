// sajilo-backend/src/modules/accounting/financialHealthService.js
const { pool } = require('../../config/database');

async function getFinancialHealth() {
  // ── Ledger metrics ──
  const ledgerQuery = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE fl.id NOT IN (
         SELECT ledger_entry_id FROM accounting_entries WHERE ledger_entry_id IS NOT NULL
       ))::int AS missing,
       COUNT(*) FILTER (WHERE fl.id IN (
         SELECT ae.ledger_entry_id FROM accounting_entries ae
         JOIN financial_ledger fl2 ON ae.ledger_entry_id = fl2.id
         WHERE fl2.event_type IN ('invoice_finalized','payment_confirmed','commission_settled')
           AND ABS(ae.amount - fl2.amount) > 0.001
       ))::int AS mismatched
     FROM financial_ledger fl
     WHERE fl.event_type IN ('invoice_finalized','payment_confirmed','commission_settled')`
  );
  const { total: totalLedger, missing: missingLedger, mismatched: mismatchedLedger } = ledgerQuery.rows[0];

  // ── Expense coverage ──
  const expenseTableResult = await pool.query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE status IN ('approved','paid')`
  );
  const expensesTableTotal = parseFloat(expenseTableResult.rows[0].total);

  const accountingExpenseResult = await pool.query(
    `SELECT COALESCE(SUM(ae.amount),0) AS total
     FROM accounting_entries ae
     JOIN accounts a ON a.code = ae.debit_account
     WHERE a.type = 'EXPENSE'`
  );
  const accountingExpenses = parseFloat(accountingExpenseResult.rows[0].total);

  let expenseCoverageRatio = 1;
  if (expensesTableTotal > 0) {
    expenseCoverageRatio = accountingExpenses / expensesTableTotal;
  }

  // ── Orphan accounting entries ──
  const orphanResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM accounting_entries
     WHERE ledger_entry_id IS NULL AND expense_id IS NULL AND journal_id IS NULL`
  );
  const orphanCount = orphanResult.rows[0].count;

  // ── Compute health score ──
  const ledgerIssueRate = totalLedger > 0
    ? (missingLedger + mismatchedLedger) / totalLedger
    : 0;
  const ledgerPenalty = ledgerIssueRate * 60;                     // max 60 points

  const coverageGap = expensesTableTotal > 0
    ? Math.abs(1 - expenseCoverageRatio)
    : 0;
  const expensePenalty = coverageGap * 20;                        // max 20 points

  const orphanPenalty = Math.min(orphanCount * 2, 20);            // max 20 points

  let healthScore = Math.round(100 - ledgerPenalty - expensePenalty - orphanPenalty);
  healthScore = Math.max(0, Math.min(100, healthScore));

  let status;
  if (healthScore >= 70) status = 'OK';
  else if (healthScore >= 50) status = 'WARNING';
  else status = 'CRITICAL';

  // ── Issues list ──
  const issues = [];
  if (missingLedger > 0) {
    issues.push(`Missing accounting entries for ${missingLedger} ledger entries`);
  }
  if (mismatchedLedger > 0) {
    issues.push(`${mismatchedLedger} ledger entries have mismatched amounts`);
  }
  if (expensesTableTotal > 0 && Math.abs(1 - expenseCoverageRatio) > 0.05) {
    issues.push(`Expense coverage ratio is ${(expenseCoverageRatio * 100).toFixed(1)}% (expected ~100%)`);
  }
  if (orphanCount > 0) {
    issues.push(`${orphanCount} orphan accounting entries (no source link)`);
  }

  return {
    healthScore,
    status,
    metrics: {
      totalLedgerEntries: totalLedger,
      missingLedgerEntries: missingLedger,
      mismatchedLedgerEntries: mismatchedLedger,
      expenseTableTotal: parseFloat(expensesTableTotal.toFixed(2)),
      accountingExpenses: parseFloat(accountingExpenses.toFixed(2)),
      expenseCoverageRatio: parseFloat(expenseCoverageRatio.toFixed(2)),
      orphanAccountingEntries: orphanCount,
    },
    issues,
  };
}

module.exports = { getFinancialHealth };