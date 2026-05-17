// sajilo-backend/src/modules/expenses/expenseCategoryService.js
const { pool } = require('../../config/database');

async function createCategory({ code, name, description, default_debit_account_id, default_credit_account_id }) {
  const result = await pool.query(
    `INSERT INTO expense_categories (code, name, description, default_debit_account_id, default_credit_account_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [code, name, description || null, default_debit_account_id || null, default_credit_account_id || null]
  );
  return result.rows[0];
}

async function getAllCategories() {
  const result = await pool.query(
    `SELECT ec.*, da.code AS debit_account_code, ca.code AS credit_account_code
     FROM expense_categories ec
     LEFT JOIN accounts da ON ec.default_debit_account_id = da.id
     LEFT JOIN accounts ca ON ec.default_credit_account_id = ca.id
     ORDER BY ec.name`
  );
  return result.rows;
}

module.exports = { createCategory, getAllCategories };