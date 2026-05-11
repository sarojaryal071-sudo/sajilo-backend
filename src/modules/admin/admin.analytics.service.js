// sajilo-backend/src/modules/admin/admin.analytics.service.js
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
     WHERE status IN ('pending_cash', 'unpaid')`
  );
  return parseFloat(result.rows[0].pending_revenue);
}

/**
 * Get booking counts by status.
 */
async function getBookingCounts() {
  const result = await pool.query(
    `SELECT status, COUNT(*)::int AS count
     FROM bookings
     GROUP BY status`
  );
  const counts = {};
  result.rows.forEach(row => { counts[row.status] = row.count; });
  return counts;
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
 * Get top earning workers (limit 10).
 */
async function getTopEarningWorkers(limit = 10) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.client_id,
            COALESCE(SUM(p.final_total), 0) AS total_earned,
            COUNT(p.id) AS completed_jobs
     FROM users u
     JOIN payments p ON p.worker_id = u.id AND p.status = 'paid'
     WHERE u.role = 'worker'
     GROUP BY u.id
     ORDER BY total_earned DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Get top rated workers (limit 10).
 */
async function getTopRatedWorkers(limit = 10) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.client_id,
            COALESCE(AVG(r.rating), 0) AS avg_rating,
            COUNT(r.id) AS review_count
     FROM users u
     JOIN reviews r ON r.worker_id = u.id
     WHERE u.role = 'worker'
     GROUP BY u.id
     ORDER BY avg_rating DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Get cancellation statistics.
 */
async function getCancellationStats() {
  const result = await pool.query(
    `SELECT cancelled_by_role, COUNT(*)::int AS count
     FROM booking_cancellations
     GROUP BY cancelled_by_role`
  );
  return result.rows;
}

/**
 * Get recent low ratings (1-2 stars, limit 10).
 */
async function getRecentLowRatings(limit = 10) {
  const result = await pool.query(
    `SELECT r.*, b.service_name, u.name AS worker_name
     FROM reviews r
     JOIN bookings b ON b.id = r.booking_id
     JOIN users u ON u.id = r.worker_id
     WHERE r.rating <= 2
     ORDER BY r.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Get active vs inactive workers count.
 */
async function getWorkerActivityStats() {
  const result = await pool.query(
    `SELECT is_online, COUNT(*)::int AS count
     FROM users
     WHERE role = 'worker' AND status = 'active'
     GROUP BY is_online`
  );
  const stats = { online: 0, offline: 0 };
  result.rows.forEach(row => {
    if (row.is_online) stats.online = row.count;
    else stats.offline = row.count;
  });
  return stats;
}

/**
 * Get bookings trend (last 7 days).
 */
async function getBookingsTrend(days = 7) {
  const result = await pool.query(
    `SELECT DATE(created_at) AS date, COUNT(*)::int AS count
     FROM bookings
     WHERE created_at >= NOW() - INTERVAL '1 day' * $1
     GROUP BY DATE(created_at)
     ORDER BY date`,
    [days]
  );
  return result.rows;
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

module.exports = {
  getTotalRevenue,
  getPendingRevenue,
  getBookingCounts,
  getPaymentStatusBreakdown,
  getPaymentMethodDistribution,
  getAverageInvoiceValue,
  getTopEarningWorkers,
  getTopRatedWorkers,
  getCancellationStats,
  getRecentLowRatings,
  getWorkerActivityStats,
  getBookingsTrend,
  getRevenueTrend,
};