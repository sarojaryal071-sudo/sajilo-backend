// sajilo-backend/src/modules/expenses/expenseClassificationEngine.js
const { pool } = require('../../config/database');

/**
 * Classify an expense based on vendor, category, and keyword match.
 * Returns { expense_type, cost_center_code }.
 */
async function classifyExpense(expense) {
  try {
    // Find matching rules, highest priority first (vendor match > category > keyword)
    const { rows } = await pool.query(
      `SELECT expense_type, cost_center_code, priority,
              CASE
                WHEN vendor_id = $1 THEN 1
                WHEN category_id = $2 THEN 2
                WHEN $3 ILIKE '%' || keyword || '%' THEN 3
                ELSE 4
              END AS match_type
       FROM expense_classification_rules
       WHERE (vendor_id = $1 OR category_id = $2 OR ($3 ILIKE '%' || keyword || '%'))
         AND is_active = true
       ORDER BY match_type ASC, priority ASC
       LIMIT 1`,
      [expense.vendor_id || null, expense.category_id || null, expense.title || '']
    );

    if (rows.length > 0) {
      return {
        expense_type: rows[0].expense_type,
        cost_center_code: rows[0].cost_center_code,
      };
    }
  } catch (err) {
    console.error('[ExpenseClassification] Failed to classify expense', err);
  }

  // Fallback
  return {
    expense_type: 'MANUAL',
    cost_center_code: 'GENERAL_ADMIN',
  };
}

module.exports = { classifyExpense };