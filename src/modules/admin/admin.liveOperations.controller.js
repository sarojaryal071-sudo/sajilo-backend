// sajilo-backend/src/modules/admin/admin.liveOperations.controller.js
const bookingAnalytics = require('./bookingAnalytics.service');
const paymentAnalytics = require('./paymentAnalytics.service');
const workerAnalytics = require('./workerAnalytics.service');
const notificationsModel = require('../notification/notification.model');

/**
 * GET /api/admin/live-operations
 * Returns key real‑time operational metrics for the admin dashboard.
 */
async function getLiveOperations(req, res) {
  try {
    const [
      activeBookings,
      unpaidInvoices,
      cancellationsToday,
      workerActivity,
    ] = await Promise.all([
      bookingAnalytics.getActiveBookingsCount(),
      paymentAnalytics.getUnpaidInvoicesCount(),
      getCancellationsToday(),
      workerAnalytics.getWorkerActivityStats(),
    ]);

    // Optionally include notification throughput (last 24h)
    let notificationsToday = 0;
    try {
      const notifRes = await notificationsModel.countSince('24 hours');
      notificationsToday = notifRes?.count || 0;
    } catch (err) {
      console.error('Failed to count notifications:', err.message);
    }

    return res.json({
      success: true,
      data: {
        activeBookings,
        unpaidInvoices,
        cancellationsToday,
        workerActivity,
        notificationsToday,
      },
    });
  } catch (err) {
    console.error('getLiveOperations error:', err);
    return res.status(500).json({ error: 'Failed to fetch live operations data' });
  }
}

/**
 * Helper: cancellations in the last 24 hours
 */
async function getCancellationsToday() {
  const { pool } = require('../../config/database');
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM booking_cancellations
     WHERE cancelled_at >= NOW() - INTERVAL '1 day'`
  );
  return result.rows[0].count;
}

module.exports = { getLiveOperations };