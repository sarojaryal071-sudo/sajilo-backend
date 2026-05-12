// sajilo-backend/src/modules/admin/workerAnalytics.service.js
const { pool } = require('../../config/database');

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

module.exports = {
  getTopEarningWorkers,
  getTopRatedWorkers,
  getRecentLowRatings,
  getWorkerActivityStats,
};