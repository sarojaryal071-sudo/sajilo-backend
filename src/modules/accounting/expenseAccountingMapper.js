// sajilo-backend/src/modules/accounting/expenseAccountingMapper.js
const { pool } = require('../../config/database');
const { getAccountByCode } = require('./accountRegistry');

/**
 * Map an expense to a double‑entry accounting payload.
 * @param {object} expense - full expense row (with category default account IDs)
 * @returns {object} { debit_account_code, credit_account_code, amount, ... }
 */
async function mapExpenseToAccounting(expense) {
  // Determine debit account from the expense category
  let debitAccountCode = 'ADJUSTMENT'; // fallback

  if (expense.category_id) {
    const catResult = await pool.query(
      'SELECT default_debit_account_id, default_credit_account_id FROM expense_categories WHERE id = $1',
      [expense.category_id]
    );
    const cat = catResult.rows[0];
    if (cat && cat.default_debit_account_id) {
      const account = await getAccountByCode(
        (await pool.query('SELECT code FROM accounts WHERE id = $1', [cat.default_debit_account_id])).rows[0]?.code
      );
      if (account) debitAccountCode = account.code;
    }
  }

  // Determine credit account
  let creditAccountCode = 'CASH'; // default for cash/bank/wallet payments

  // If a vendor is involved, treat as a payable
  if (expense.vendor_id) {
    // In the future this could be VENDOR_PAYABLE; today we use WORKER_PAYABLE as a generic payable
    creditAccountCode = 'WORKER_PAYABLE';
  }

  // If payment method is explicitly a cash equivalent, override to CASH
  if (expense.payment_method === 'cash' || expense.payment_method === 'bank' || expense.payment_method === 'wallet') {
    creditAccountCode = 'CASH';
  }

  return {
    debit_account: debitAccountCode,
    credit_account: creditAccountCode,
    amount: parseFloat(expense.amount),
    reference_type: 'EXPENSE',
    reference_id: expense.id,
    remarks: `Expense: ${expense.title}`,
  };
}

module.exports = { mapExpenseToAccounting };