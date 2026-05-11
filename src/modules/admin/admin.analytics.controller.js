// sajilo-backend/src/modules/admin/admin.analytics.controller.js
const analyticsService = require('./admin.analytics.service');

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
      analyticsService.getTotalRevenue(),
      analyticsService.getPendingRevenue(),
      analyticsService.getBookingCounts(),
      analyticsService.getPaymentStatusBreakdown(),
      analyticsService.getPaymentMethodDistribution(),
      analyticsService.getAverageInvoiceValue(),
      analyticsService.getTopEarningWorkers(),
      analyticsService.getTopRatedWorkers(),
      analyticsService.getCancellationStats(),
      analyticsService.getRecentLowRatings(),
      analyticsService.getWorkerActivityStats(),
      analyticsService.getBookingsTrend(),
      analyticsService.getRevenueTrend(),
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