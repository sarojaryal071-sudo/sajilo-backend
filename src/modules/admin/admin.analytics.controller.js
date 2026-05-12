// sajilo-backend/src/modules/admin/admin.analytics.controller.js
const bookingAnalytics = require('./bookingAnalytics.service');
const paymentAnalytics = require('./paymentAnalytics.service');
const workerAnalytics = require('./workerAnalytics.service');

/**
 * GET /api/admin/analytics
 * Returns a comprehensive analytics summary for the admin dashboard.
 */
async function getAllAnalytics(req, res) {
  try {
    const [
      totalRevenue,
      pendingRevenue,
      bookingCounts,
      paymentStatusBreakdown,
      paymentMethodDistribution,
      averageInvoiceValue,
      topEarningWorkers,
      topRatedWorkers,
      cancellationStats,
      recentLowRatings,
      workerActivityStats,
      bookingsTrend,
      revenueTrend,
    ] = await Promise.all([
      paymentAnalytics.getTotalRevenue(),
      paymentAnalytics.getPendingRevenue(),
      bookingAnalytics.getBookingCounts(),
      paymentAnalytics.getPaymentStatusBreakdown(),
      paymentAnalytics.getPaymentMethodDistribution(),
      paymentAnalytics.getAverageInvoiceValue(),
      workerAnalytics.getTopEarningWorkers(),
      workerAnalytics.getTopRatedWorkers(),
      bookingAnalytics.getCancellationStats(),
      workerAnalytics.getRecentLowRatings(),
      workerAnalytics.getWorkerActivityStats(),
      bookingAnalytics.getBookingsTrend(),
      paymentAnalytics.getRevenueTrend(),
    ]);

    return res.json({
      success: true,
      data: {
        totalRevenue,
        pendingRevenue,
        bookingCounts,
        paymentStatusBreakdown,
        paymentMethodDistribution,
        averageInvoiceValue,
        topEarningWorkers,
        topRatedWorkers,
        cancellationStats,
        recentLowRatings,
        workerActivityStats,
        bookingsTrend,
        revenueTrend,
      },
    });
  } catch (err) {
    console.error('getAllAnalytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}

module.exports = { getAllAnalytics };