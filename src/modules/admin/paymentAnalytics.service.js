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

// ── Provider Breakdown ──
async function getProviderBreakdown() {
  const result = await pool.query(
    `SELECT COALESCE(payment_provider, 'cash') AS provider, COUNT(*)::int AS count,
            COALESCE(SUM(final_total), 0) AS total
     FROM payments WHERE status = 'paid'
     GROUP BY payment_provider`
  );
  return result.rows;
}

// ── Operational Metrics ──
async function getOperationalMetrics() {
  const now = new Date();
  const [pending, overdue] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int FROM payments
       WHERE status IN ('pending_cash','awaiting_cash_confirmation','awaiting_digital_confirmation')`
    ),
    pool.query(
      `SELECT COUNT(*)::int FROM payments
       WHERE status IN ('pending_cash','awaiting_cash_confirmation','awaiting_digital_confirmation')
         AND payment_due_at IS NOT NULL AND payment_due_at < $1`,
      [now]
    ),
  ]);
  return {
    pendingConfirmations: pending.rows[0].count,
    overdueConfirmations: overdue.rows[0].count,
  };
}

// ── Worker Payment Reliability ──
async function getWorkerPaymentReliability() {
  const result = await pool.query(
    `SELECT u.id, u.name, u.client_id,
            COUNT(*) FILTER (WHERE p.status = 'paid')::int AS confirmed,
            COUNT(*)::int AS total,
            ROUND(AVG(EXTRACT(EPOCH FROM (p.paid_at - p.invoice_confirmed_at))/60)::numeric, 1) AS avg_confirmation_minutes
     FROM users u
     JOIN payments p ON p.worker_id = u.id
     WHERE p.invoice_confirmed_at IS NOT NULL
     GROUP BY u.id`
  );
  return result.rows.map(r => ({
    ...r,
    confirmationRate: r.total > 0 ? Math.round((r.confirmed / r.total) * 100) : 0,
  }));
}

// ── Settlement Speed ──
async function getSettlementSpeed() {
  const result = await pool.query(
    `SELECT u.id, u.name,
            COUNT(fl.id)::int AS settlements,
            ROUND(AVG(EXTRACT(EPOCH FROM (fl.created_at - p.paid_at))/3600)::numeric, 1) AS avg_hours_to_settle
     FROM financial_ledger fl
     JOIN payments p ON p.booking_id = fl.booking_id
     JOIN users u ON u.id = p.worker_id
     WHERE fl.event_type = 'settlement_recorded' AND p.paid_at IS NOT NULL
     GROUP BY u.id`
  );
  return result.rows;
}

module.exports = {
  getTotalRevenue,
  getPendingRevenue,
  getPaymentStatusBreakdown,
  getPaymentMethodDistribution,
  getAverageInvoiceValue,
  getRevenueTrend,
  getUnpaidInvoicesCount,
  getProviderBreakdown,
  getOperationalMetrics,
  getWorkerPaymentReliability,
  getSettlementSpeed,
};