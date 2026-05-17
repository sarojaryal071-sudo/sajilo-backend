// sajilo-backend/src/modules/expenses/expenseLifecycleService.js
const { pool } = require('../../config/database');

// Allowed forward transitions only (no skipping, no backward)
const VALID_TRANSITIONS = {
  draft:   ['pending'],
  pending: ['approved'],
  approved:['paid'],
  paid:    ['closed'],
};

// Fields that become immutable after approval
const IMMUTABLE_FIELDS = ['amount', 'vendor_id', 'category_id'];

/**
 * Validate and execute an expense status change, enforcing:
 *  - valid state transitions
 *  - immutability of critical fields after approval
 *  - audit logging
 */
async function updateStatus(expenseId, newStatus, userId, options = {}) {
  // 1. Fetch current expense
  const current = await pool.query('SELECT * FROM expenses WHERE id = $1', [expenseId]);
  if (!current.rows[0]) throw new Error('Expense not found');
  const oldExpense = current.rows[0];

  // 2. Enforce valid transition
  const allowed = VALID_TRANSITIONS[oldExpense.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${oldExpense.status} to ${newStatus}`);
  }

  // 3. If the expense is already approved or beyond, enforce immutability
  if (['approved', 'paid', 'closed'].includes(oldExpense.status)) {
    if (options.amount !== undefined && parseFloat(options.amount) !== parseFloat(oldExpense.amount)) {
      throw new Error('Amount cannot be modified after approval');
    }
    if (options.vendor_id !== undefined && options.vendor_id !== oldExpense.vendor_id) {
      throw new Error('Vendor cannot be modified after approval');
    }
    if (options.category_id !== undefined && options.category_id !== oldExpense.category_id) {
      throw new Error('Category cannot be modified after approval');
    }
  }

  // 4. Determine action type for audit log
  let actionType = 'STATUS_CHANGE';
  if (newStatus === 'approved') actionType = 'APPROVE';
  else if (newStatus === 'paid') actionType = 'PAY';

  // 5. Update status (and approved_by if moving to approved)
  let updateQuery = `UPDATE expenses
                     SET status = $2,
                         updated_at = NOW()
                     WHERE id = $1
                     RETURNING *`;
  const params = [expenseId, newStatus];

  if (newStatus === 'approved' && userId) {
    updateQuery = `UPDATE expenses
                   SET status = $2,
                       approved_by = $3,
                       updated_at = NOW()
                   WHERE id = $1
                   RETURNING *`;
    params.push(userId);
  }

  const result = await pool.query(updateQuery, params);
  const newExpense = result.rows[0];

  // 6. Write audit log (append-only)
  await pool.query(
    `INSERT INTO expense_audit_logs (expense_id, action_type, old_value, new_value, performed_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      expenseId,
      actionType,
      JSON.stringify({ status: oldExpense.status, amount: oldExpense.amount, vendor_id: oldExpense.vendor_id, category_id: oldExpense.category_id }),
      JSON.stringify({ status: newStatus, amount: newExpense.amount, vendor_id: newExpense.vendor_id, category_id: newExpense.category_id }),
      userId,
    ]
  );

  // 7. Fire Phase 6B.2 trigger (non-blocking) when appropriate
  if (newStatus === 'approved' || newStatus === 'paid') {
    const { onExpenseStatusChanged } = require('../accounting/expenseAccountingTrigger');
    onExpenseStatusChanged(newExpense);
  }

  return newExpense;
}

module.exports = { updateStatus };