// sajilo-backend/src/modules/expenses/expenseService.js
const { pool } = require('../../config/database');

async function createExpense({ title, category_id, vendor_id, amount, currency, payment_method, reference_number, invoice_number, description, expense_date, due_date, status, receipt_url, created_by }) {
  const result = await pool.query(
    `INSERT INTO expenses (title, category_id, vendor_id, amount, currency, payment_method, reference_number, invoice_number, description, expense_date, due_date, status, receipt_url, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [title, category_id || null, vendor_id || null, amount, currency || 'NPR', payment_method || 'cash', reference_number || null, invoice_number || null, description || null, expense_date || new Date().toISOString().slice(0,10), due_date || null, status || 'draft', receipt_url || null, created_by || null]
  );
  const expense = result.rows[0];

  // Classify and update (fire-and-forget, non-blocking)
  const { classifyExpense } = require('./expenseClassificationEngine');
  classifyExpense(expense).then(({ expense_type, cost_center_code }) => {
    pool.query(
      `UPDATE expenses SET expense_type = $2, cost_center_code = $3 WHERE id = $1`,
      [expense.id, expense_type, cost_center_code]
    ).catch(() => {}); // silent
  }).catch(() => {});

  return expense;
}

async function getAllExpenses(limit = 50) {
  const result = await pool.query(
    `SELECT e.*, ec.name AS category_name, v.name AS vendor_name
     FROM expenses e
     LEFT JOIN expense_categories ec ON e.category_id = ec.id
     LEFT JOIN vendors v ON e.vendor_id = v.id
     ORDER BY e.created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function updateExpenseStatus(id, status, userId = null) {
  const { updateStatus } = require('./expenseLifecycleService');
  return await updateStatus(id, status, userId);
}

async function createSystemGeneratedExpense({ title, vendor_id, category_id, amount, expense_date, cost_center_code, expense_type }) {
  const result = await pool.query(
    `INSERT INTO expenses (title, vendor_id, category_id, amount, expense_date, status, cost_center_code, expense_type, created_by)
     VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,null) RETURNING *`,
    [title, vendor_id || null, category_id || null, amount, expense_date || new Date().toISOString().slice(0,10), cost_center_code || 'GENERAL_ADMIN', expense_type || 'RECURRING']
  );
  const expense = result.rows[0];

  // Fire classification (6C.1) non-blocking
  const { classifyExpense } = require('./expenseClassificationEngine');
  classifyExpense(expense).then(({ expense_type: expType, cost_center_code: cc }) => {
    pool.query('UPDATE expenses SET expense_type = $2, cost_center_code = $3 WHERE id = $1', [expense.id, expType, cc]).catch(() => {});
  }).catch(() => {});

  return expense;
}

module.exports = { createExpense, getAllExpenses, updateExpenseStatus, createSystemGeneratedExpense };