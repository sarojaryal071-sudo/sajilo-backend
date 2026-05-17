// sajilo-backend/src/modules/accounting/pnlReconciliationValidator.js
const { pool } = require('../../config/database');

async function validateProfitLoss() {
  // 1. Revenue: sum of credits to PLATFORM_REVENUE
  const revenueResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM accounting_entries
     WHERE credit_account = 'PLATFORM_REVENUE'`
  );
  const accountingRevenue = parseFloat(revenueResult.rows[0].total);

  // 2. Expenses: sum of debits to expense-type accounts
  const expenseAccounts = await pool.query(
    `SELECT code FROM accounts WHERE type = 'EXPENSE'`
  );
  const expenseCodes = expenseAccounts.rows.map(r => r.code);
  let accountingExpenses = 0;
  if (expenseCodes.length > 0) {
    const expenseResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM accounting_entries
       WHERE debit_account = ANY($1)`,
      [expenseCodes]
    );
    accountingExpenses = parseFloat(expenseResult.rows[0].total);
  }

  const accountingProfit = accountingRevenue - accountingExpenses;

  // 3. Cross‑check against expenses table (approved + paid)
  const expensesTableResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE status IN ('approved', 'paid')`
  );
  const expensesTableTotal = parseFloat(expensesTableResult.rows[0].total);

  // 4. Find missing expense entries (expenses with no accounting link)
  const missingExpenseRows = await pool.query(
    `SELECT e.id, e.title, e.amount
     FROM expenses e
     WHERE e.status IN ('approved', 'paid')
       AND NOT EXISTS (
         SELECT 1 FROM accounting_entries ae
         WHERE ae.expense_id = e.id
       )`
  );

  // 5. Orphan accounting revenue entries (no matching ledger/expense)
  const orphanRevenue = await pool.query(
    `SELECT ae.id, ae.amount, ae.created_at
     FROM accounting_entries ae
     WHERE ae.credit_account = 'PLATFORM_REVENUE'
       AND ae.ledger_entry_id IS NULL
       AND ae.expense_id IS NULL
       AND ae.journal_id IS NULL`
  );

  // 6. Compute coverage ratio
  const expenseCoverageRatio = expensesTableTotal > 0
    ? parseFloat(((accountingExpenses / expensesTableTotal) * 100).toFixed(2))
    : 0;

  return {
    accountingRevenue: parseFloat(accountingRevenue.toFixed(2)),
    accountingExpenses: parseFloat(accountingExpenses.toFixed(2)),
    accountingProfit: parseFloat(accountingProfit.toFixed(2)),
    expensesTableTotal: parseFloat(expensesTableTotal.toFixed(2)),
    difference: parseFloat((accountingExpenses - expensesTableTotal).toFixed(2)),
    expenseCoverageRatio,
    missingExpenseEntries: missingExpenseRows.rows,
    orphanRevenueEntries: orphanRevenue.rows,
  };
}

module.exports = { validateProfitLoss };