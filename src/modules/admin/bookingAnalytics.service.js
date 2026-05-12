// sajilo-backend/src/modules/admin/bookingAnalytics.service.js
const { pool } = require('../../config/database');

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
 * Get count of currently active bookings (onway or working).
 */
async function getActiveBookingsCount() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM bookings
     WHERE status IN ('onway', 'working')`
  );
  return result.rows[0].count;
}

module.exports = {
  getBookingCounts,
  getCancellationStats,
  getBookingsTrend,
  getActiveBookingsCount,
};