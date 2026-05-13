/**
 * Metrics Engine Service
 * Phase 16 — Single Source of Truth Architecture
 * 
 * THE SINGLE SOURCE for ALL derived worker metrics.
 * 
 * Rules:
 * - Reads raw tables ONLY (bookings, payments, reviews, booking_cancellations)
 * - NEVER writes to database
 * - NEVER caches results
 * - NEVER reads cached stats from users table
 * - ALWAYS deterministic
 * 
 * This replaces all scattered stat computations across the system.
 */

const { pool } = require('../../config/database');
const TRUTH_REGISTRY = require('../../config/truthRegistry');

class MetricsEngine {
  /**
   * Compute ALL derived metrics for a single worker.
   * Returns the authoritative truth for this worker's stats.
   * 
   * @param {number|string} workerId
   * @returns {Object} Computed worker metrics
   */
  async computeWorkerMetrics(workerId) {
    const [
      bookingMetrics,
      paymentMetrics,
      reviewMetrics,
      cancellationMetrics,
    ] = await Promise.all([
      this._computeBookingMetrics(workerId),
      this._computePaymentMetrics(workerId),
      this._computeReviewMetrics(workerId),
      this._computeCancellationMetrics(workerId),
    ]);

    return {
      workerId,
      computedAt: new Date().toISOString(),
      source: 'metricsEngine',
      version: '16.0',
      bookings: bookingMetrics,
      payments: paymentMetrics,
      reviews: reviewMetrics,
      cancellations: cancellationMetrics,
      // Composite trust indicators (derived, never stored)
      composite: {
        trustScore: this._calculateTrustScore(bookingMetrics, reviewMetrics),
        reliabilityLabel: this._calculateReliabilityLabel(bookingMetrics),
      },
    };
  }

  /**
   * Bulk compute metrics for multiple workers.
   * @param {number[]} workerIds
   * @returns {Object[]}
   */
  async computeBulkWorkerMetrics(workerIds) {
    if (!workerIds || workerIds.length === 0) return [];
    const results = await Promise.allSettled(
      workerIds.map(id => this.computeWorkerMetrics(id))
    );
    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
  }

  // ─── DOMAIN COMPUTATION METHODS ────────────────────────────────

  async _computeBookingMetrics(workerId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*)::int AS total_bookings,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_jobs,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_jobs,
        COUNT(*) FILTER (WHERE status IN ('pending', 'accepted', 'onway', 'working'))::int AS active_bookings,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / 
          NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled')), 0)
        ) AS completion_rate,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'cancelled') * 100.0 / 
          NULLIF(COUNT(*), 0)
        ) AS cancellation_rate,
        ROUND(
          COUNT(*) FILTER (WHERE status IN ('accepted', 'onway', 'working', 'completed')) * 100.0 / 
          NULLIF(COUNT(*), 0)
        ) AS acceptance_rate
      FROM bookings
      WHERE worker_id = $1`,
      [workerId]
    );

    const row = result.rows[0];
    return {
      totalBookings: row.total_bookings || 0,
      completedJobs: row.completed_jobs || 0,
      cancelledJobs: row.cancelled_jobs || 0,
      activeBookings: row.active_bookings || 0,
      completionRate: parseInt(row.completion_rate) || 0,
      cancellationRate: parseInt(row.cancellation_rate) || 0,
      acceptanceRate: parseInt(row.acceptance_rate) || 0,
    };
  }

  async _computePaymentMetrics(workerId) {
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(final_total), 0) AS total_earnings,
        COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
        COUNT(*) FILTER (WHERE status IN ('pending_cash', 'unpaid'))::int AS pending_count,
        COALESCE(AVG(final_total) FILTER (WHERE status = 'paid'), 0) AS average_invoice
      FROM payments
      WHERE worker_id = $1`,
      [workerId]
    );

    const row = result.rows[0];
    return {
      totalEarnings: parseFloat(row.total_earnings) || 0,
      paidCount: row.paid_count || 0,
      pendingCount: row.pending_count || 0,
      averageInvoice: parseFloat(row.average_invoice) || 0,
    };
  }

  async _computeReviewMetrics(workerId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*)::int AS review_count,
        COALESCE(AVG(rating)::numeric(10,1), 0) AS average_rating,
        COUNT(*) FILTER (WHERE rating >= 4)::int AS positive_reviews,
        COUNT(*) FILTER (WHERE rating <= 2)::int AS negative_reviews
      FROM reviews
      WHERE worker_id = $1`,
      [workerId]
    );

    const row = result.rows[0];
    return {
      reviewCount: row.review_count || 0,
      averageRating: parseFloat(row.average_rating) || 0,
      positiveReviews: row.positive_reviews || 0,
      negativeReviews: row.negative_reviews || 0,
    };
  }

  async _computeCancellationMetrics(workerId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*)::int AS total_cancellations,
        COUNT(*) FILTER (WHERE cancelled_by_role = 'customer')::int AS by_customer,
        COUNT(*) FILTER (WHERE cancelled_by_role = 'worker')::int AS by_worker
      FROM booking_cancellations
      WHERE worker_id = $1`,
      [workerId]
    );

    // If booking_cancellations table doesn't exist yet, return empty
    const row = result.rows[0] || {};
    return {
      totalCancellations: row.total_cancellations || 0,
      byCustomer: row.by_customer || 0,
      byWorker: row.by_worker || 0,
    };
  }

  // ─── COMPOSITE METRICS (DERIVED, NEVER STORED) ─────────────────

  _calculateTrustScore(bookingMetrics, reviewMetrics) {
    // Weighted score from registry rules
    const weights = {
      completionRate: 0.30,
      reviewAverage: 0.25,
      acceptanceRate: 0.15,
      cancellationPenalty: -0.10,
      bookingVolume: 0.10,
      reviewCount: 0.10,
    };

    let score = 0;
    score += (bookingMetrics.completionRate || 0) * weights.completionRate;
    score += ((reviewMetrics.averageRating || 0) / 5) * 100 * weights.reviewAverage;
    score += (bookingMetrics.acceptanceRate || 0) * weights.acceptanceRate;
    score += (bookingMetrics.cancellationRate || 0) * weights.cancellationPenalty;
    score += Math.min(bookingMetrics.completedJobs || 0, 100) * weights.bookingVolume;
    score += Math.min(reviewMetrics.reviewCount || 0, 50) * 2 * weights.reviewCount;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  _calculateReliabilityLabel(bookingMetrics) {
    const rate = bookingMetrics.completionRate || 0;
    if (rate >= 90) return 'Excellent';
    if (rate >= 70) return 'Good';
    if (rate >= 50) return 'Fair';
    return 'Poor';
  }

  // ─── TIME-WINDOWED METRICS (DERIVED, NEVER STORED) ─────────────

  /**
   * Compute today's metrics for a worker.
   * Today = CURRENT_DATE in server timezone.
   * Automatically resets to 0 tomorrow.
   */
  async computeTodayMetrics(workerId) {
    const [payments, bookings] = await Promise.all([
      pool.query(
        `SELECT 
          COALESCE(SUM(final_total), 0) AS today_earnings,
          COUNT(*)::int AS today_payments
         FROM payments
         WHERE worker_id = $1
           AND status = 'paid'
           AND DATE(paid_at) = CURRENT_DATE`,
        [workerId]
      ),
      pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'completed')::int AS today_completed,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS today_cancelled,
          COUNT(*)::int AS today_total
         FROM bookings
         WHERE worker_id = $1
           AND DATE(updated_at) = CURRENT_DATE`,
        [workerId]
      ),
    ]);

    return {
      workerId,
      date: new Date().toISOString().split('T')[0],
      earnings: parseFloat(payments.rows[0]?.today_earnings) || 0,
      payments: payments.rows[0]?.today_payments || 0,
      completedJobs: bookings.rows[0]?.today_completed || 0,
      cancelledJobs: bookings.rows[0]?.today_cancelled || 0,
      totalBookings: bookings.rows[0]?.today_total || 0,
      source: 'metricsEngine',
      window: 'today',
    };
  }

  /**
   * Compute weekly metrics (last 7 days including today).
   * Returns daily breakdown array for chart rendering.
   */
  async computeWeeklyMetrics(workerId) {
    const result = await pool.query(
      `SELECT 
        DATE(paid_at) AS day,
        COALESCE(SUM(final_total), 0) AS daily_earnings,
        COUNT(*)::int AS daily_payments
       FROM payments
       WHERE worker_id = $1
         AND status = 'paid'
         AND paid_at >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY DATE(paid_at)
       ORDER BY day`,
      [workerId]
    );

    // Build 7-day array with 0 for missing days
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = result.rows.find(r => {
        const rDate = new Date(r.day).toISOString().split('T')[0];
        return rDate === dateStr;
      });
      days.push({
        date: dateStr,
        earnings: found ? parseFloat(found.daily_earnings) : 0,
        payments: found ? found.daily_payments : 0,
      });
    }

    const totalEarnings = days.reduce((sum, d) => sum + d.earnings, 0);

    return {
      workerId,
      days,
      totalEarnings,
      source: 'metricsEngine',
      window: 'weekly',
    };
  }

  /**
   * Compute monthly metrics (last 12 months).
   * Returns monthly breakdown array for chart rendering.
   */
  async computeMonthlyMetrics(workerId) {
    const result = await pool.query(
      `SELECT 
        DATE_TRUNC('month', paid_at) AS month,
        COALESCE(SUM(final_total), 0) AS monthly_earnings,
        COUNT(*)::int AS monthly_payments
       FROM payments
       WHERE worker_id = $1
         AND status = 'paid'
         AND paid_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
       GROUP BY DATE_TRUNC('month', paid_at)
       ORDER BY month`,
      [workerId]
    );

    // Build 12-month array with 0 for missing months
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = result.rows.find(r => {
        const rDate = new Date(r.month);
        const rKey = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}`;
        return rKey === monthKey;
      });
      months.push({
        month: monthKey,
        label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        earnings: found ? parseFloat(found.monthly_earnings) : 0,
        payments: found ? found.monthly_payments : 0,
      });
    }

    const totalEarnings = months.reduce((sum, m) => sum + m.earnings, 0);

    return {
      workerId,
      months,
      totalEarnings,
      source: 'metricsEngine',
      window: 'monthly',
    };
  }

  /**
   * Get complete time-windowed dashboard metrics in one call.
   * Combines: today + weekly + monthly + lifetime totals.
   */
  async computeDashboardMetrics(workerId) {
    const [lifetime, today, weekly, monthly] = await Promise.all([
      this.computeWorkerMetrics(workerId),
      this.computeTodayMetrics(workerId),
      this.computeWeeklyMetrics(workerId),
      this.computeMonthlyMetrics(workerId),
    ]);

    return {
      workerId,
      computedAt: new Date().toISOString(),
      source: 'metricsEngine',
      version: '16.1',
      today,
      weekly,
      monthly,
      lifetime: {
        totalEarnings: lifetime.payments.totalEarnings,
        completedJobs: lifetime.bookings.completedJobs,
        averageRating: lifetime.reviews.averageRating,
        reviewCount: lifetime.reviews.reviewCount,
        completionRate: lifetime.bookings.completionRate,
        cancellationRate: lifetime.bookings.cancellationRate,
        trustScore: lifetime.composite.trustScore,
        reliabilityLabel: lifetime.composite.reliabilityLabel,
      },
    };
  }
}

module.exports = new MetricsEngine();