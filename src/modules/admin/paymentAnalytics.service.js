// sajilo-backend/src/modules/admin/paymentAnalytics.service.js
const { pool } = require('../../config/database');

/**
 * Get total revenue from paid payments.
 */
async function getTotalRevenue() {
  const result = await pool.query(
    `SELECT COALESCE(SUM(final_total), 0) AS total_revenue
     FROM payments
     WHERE status = 'paid'`
  );
  return parseFloat(result.rows[0].total_revenue);
}

/**
 * Get revenue pending (pending_cash + unpaid).
 */
async function getPendingRevenue() {
  const result = await pool.query(
    `SELECT COALESCE(SUM(final_total), 0) AS pending_revenue
     FROM payments
     WHERE status IN ('pending_cash', 'unpaid', 'awaiting_cash_confirmation', 'awaiting_digital_confirmation')`
  );
  return parseFloat(result.rows[0].pending_revenue);
}

/**
 * Get payment status breakdown.
 */
async function getPaymentStatusBreakdown() {
  const result = await pool.query(
    `SELECT status, COUNT(*)::int AS count
     FROM payments
     GROUP BY status`
  );
  return result.rows;
}

/**
 * Get payment method distribution.
 */
async function getPaymentMethodDistribution() {
  const result = await pool.query(
    `SELECT method, COUNT(*)::int AS count
     FROM payments
     GROUP BY method`
  );
  return result.rows;
}

/**
 * Get average invoice value.
 */
async function getAverageInvoiceValue() {
  const result = await pool.query(
    `SELECT COALESCE(AVG(final_total), 0) AS avg_value
     FROM payments
     WHERE status = 'paid'`
  );
  return parseFloat(result.rows[0].avg_value);
}

/**
 * Get revenue trend (last 7 days, paid payments).
 */
async function getRevenueTrend(days = 7) {
  const result = await pool.query(
    `SELECT DATE(paid_at) AS date, COALESCE(SUM(final_total), 0) AS revenue
     FROM payments
     WHERE status = 'paid' AND paid_at >= NOW() - INTERVAL '1 day' * $1
     GROUP BY DATE(paid_at)
     ORDER BY date`,
    [days]
  );
  return result.rows;
}

/**
 * Get number of unpaid invoices (pending_cash + unpaid).
 */
async function getUnpaidInvoicesCount() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM payments
     WHERE status IN ('pending_cash', 'unpaid', 'awaiting_cash_confirmation', 'awaiting_digital_confirmation')`
  );
  return result.rows[0].count;
}

module.exports = {
  getTotalRevenue,
  getPendingRevenue,
  getPaymentStatusBreakdown,
  getPaymentMethodDistribution,
  getAverageInvoiceValue,
  getRevenueTrend,
  getUnpaidInvoicesCount,
};