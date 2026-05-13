/**
 * Reconciliation Engine Service
 * Phase 16 — Single Source of Truth Architecture
 * 
 * DETECTS data inconsistencies across the system.
 * 
 * Rules:
 * - READS raw tables only
 * - NEVER modifies data
 * - NEVER auto-fixes
 * - Returns structured mismatch reports
 * - Severity: low | medium | high
 */

const { pool } = require('../../config/database');
const TRUTH_REGISTRY = require('../../config/truthRegistry');

class ReconciliationEngine {
  /**
   * Run ALL reconciliation checks for a single worker.
   * @param {number|string} workerId
   * @returns {Object} Mismatch report
   */
  async reconcileWorker(workerId) {
    const checks = await Promise.allSettled([
      this._checkPaymentBookingMismatch(workerId),
      this._checkMissingReviews(workerId),
      this._checkOrphanBookings(workerId),
      this._checkDuplicatePayments(workerId),
      this._checkWorkerStatsMismatch(workerId),
      this._checkCancellationWithoutRecord(workerId),
    ]);

    const issues = checks
      .filter(c => c.status === 'fulfilled' && c.value !== null)
      .map(c => c.value);

    return {
      workerId,
      checkedAt: new Date().toISOString(),
      totalIssues: issues.length,
      issues,
      severity: this._highestSeverity(issues),
      source: 'reconciliationEngine',
      version: '16.0',
    };
  }

  /**
   * Run ALL reconciliation checks system-wide.
   * @returns {Object} System-wide mismatch report
   */
  async reconcileSystem() {
    // Get all workers
    const workers = await pool.query(
      `SELECT id, client_id, name FROM users WHERE role = 'worker'`
    );

    const results = await Promise.allSettled(
      workers.rows.map(w => this.reconcileWorker(w.id))
    );

    const workerReports = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const workersWithIssues = workerReports.filter(r => r.totalIssues > 0);

    return {
      checkedAt: new Date().toISOString(),
      totalWorkers: workers.rows.length,
      workersWithIssues: workersWithIssues.length,
      totalIssuesFound: workersWithIssues.reduce((sum, r) => sum + r.totalIssues, 0),
      bySeverity: {
        high: workersWithIssues.filter(r => r.severity === 'high').length,
        medium: workersWithIssues.filter(r => r.severity === 'medium').length,
        low: workersWithIssues.filter(r => r.severity === 'low').length,
      },
      details: workersWithIssues,
      source: 'reconciliationEngine',
      version: '16.0',
    };
  }

  // ─── INDIVIDUAL CHECKS ─────────────────────────────────────────

  async _checkPaymentBookingMismatch(workerId) {
    try {
      const result = await pool.query(
        `SELECT p.id AS payment_id, p.booking_id, p.status AS payment_status, 
                b.status AS booking_status, p.final_total
         FROM payments p
         JOIN bookings b ON b.id = p.booking_id
         WHERE p.worker_id = $1
           AND p.status = 'paid'
           AND b.status != 'completed'`,
        [workerId]
      );

      if (result.rows.length === 0) return null;

      return {
        ruleId: 'payment_booking_mismatch',
        description: 'Payment marked as paid but booking is not completed',
        severity: 'high',
        count: result.rows.length,
        details: result.rows.map(r => ({
          paymentId: r.payment_id,
          bookingId: r.booking_id,
          paymentStatus: r.payment_status,
          bookingStatus: r.booking_status,
          amount: parseFloat(r.final_total),
        })),
      };
    } catch (e) {
      // Table may not exist in all environments
      return null;
    }
  }

  async _checkMissingReviews(workerId) {
    const result = await pool.query(
      `SELECT b.id AS booking_id, b.status, b.updated_at,
              r.id AS review_id
       FROM bookings b
       LEFT JOIN reviews r ON r.booking_id = b.id
       WHERE b.worker_id = $1
         AND b.status = 'completed'
         AND b.updated_at < NOW() - INTERVAL '7 days'
         AND r.id IS NULL
       LIMIT 20`,
      [workerId]
    );

    if (result.rows.length === 0) return null;

    return {
      ruleId: 'missing_review_after_completion',
      description: 'Booking completed >7 days ago with no review',
      severity: 'low',
      count: result.rows.length,
      details: result.rows.map(r => ({
        bookingId: r.booking_id,
        completedAt: r.updated_at,
      })),
    };
  }

  async _checkOrphanBookings(workerId) {
    try {
      const result = await pool.query(
        `SELECT b.id AS booking_id, b.status, b.booking_total_price,
                p.id AS payment_id
         FROM bookings b
         LEFT JOIN payments p ON p.booking_id = b.id
         WHERE b.worker_id = $1
           AND b.status = 'completed'
           AND p.id IS NULL`,
        [workerId]
      );

      if (result.rows.length === 0) return null;

      return {
        ruleId: 'orphan_booking',
        description: 'Completed booking has no payment record',
        severity: 'medium',
        count: result.rows.length,
        details: result.rows.map(r => ({
          bookingId: r.booking_id,
          totalPrice: parseFloat(r.booking_total_price),
        })),
      };
    } catch (e) {
      return null;
    }
  }

  async _checkDuplicatePayments(workerId) {
    try {
      const result = await pool.query(
        `SELECT booking_id, COUNT(*)::int AS payment_count
         FROM payments
         WHERE worker_id = $1
           AND status = 'paid'
         GROUP BY booking_id
         HAVING COUNT(*) > 1`,
        [workerId]
      );

      if (result.rows.length === 0) return null;

      return {
        ruleId: 'duplicate_payment',
        description: 'Multiple paid payments for the same booking',
        severity: 'high',
        count: result.rows.length,
        details: result.rows.map(r => ({
          bookingId: r.booking_id,
          paymentCount: r.payment_count,
        })),
      };
    } catch (e) {
      return null;
    }
  }

  async _checkWorkerStatsMismatch(workerId) {
    // Compare cached users.completed_jobs vs computed from bookings
    const [cached, computed] = await Promise.all([
      pool.query(`SELECT completed_jobs, total_earnings FROM users WHERE id = $1`, [workerId]),
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE status = 'completed')::int AS actual_completed,
                COUNT(*) FILTER (WHERE status = 'cancelled')::int AS actual_cancelled
         FROM bookings WHERE worker_id = $1`,
        [workerId]
      ),
    ]);

    const cachedJobs = parseInt(cached.rows[0]?.completed_jobs) || 0;
    const actualJobs = computed.rows[0]?.actual_completed || 0;

    if (cachedJobs === actualJobs) return null;

    return {
      ruleId: 'worker_stats_mismatch',
      description: 'Cached completed_jobs differs from actual booking count',
      severity: 'medium',
      count: 1,
      details: [{
        cachedValue: cachedJobs,
        computedValue: actualJobs,
        difference: actualJobs - cachedJobs,
      }],
    };
  }

  async _checkCancellationWithoutRecord(workerId) {
    try {
      const result = await pool.query(
        `SELECT b.id AS booking_id, b.updated_at,
                bc.id AS cancellation_id
         FROM bookings b
         LEFT JOIN booking_cancellations bc ON bc.booking_id = b.id
         WHERE b.worker_id = $1
           AND b.status = 'cancelled'
           AND bc.id IS NULL`,
        [workerId]
      );

      if (result.rows.length === 0) return null;

      return {
        ruleId: 'cancellation_without_record',
        description: 'Booking cancelled but no cancellation record exists',
        severity: 'medium',
        count: result.rows.length,
        details: result.rows.map(r => ({
          bookingId: r.booking_id,
          cancelledAt: r.updated_at,
        })),
      };
    } catch (e) {
      // booking_cancellations table may not exist yet
      return null;
    }
  }

  // ─── HELPERS ───────────────────────────────────────────────────

  _highestSeverity(issues) {
    const severities = issues.map(i => i.severity);
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    if (severities.includes('low')) return 'low';
    return 'none';
  }
}

module.exports = new ReconciliationEngine();