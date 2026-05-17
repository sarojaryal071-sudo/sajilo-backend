// sajilo-backend/src/modules/control/riskEngine.js
const { pool } = require('../../config/database');

async function getRiskScore() {
  // 1. Alert frequency (last 30 days active alerts)
  const alertCounts = await pool.query(`
    SELECT severity, COUNT(*)::int AS count
    FROM control_alerts
    WHERE status = 'ACTIVE' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY severity
  `);
  const sevCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  alertCounts.rows.forEach(r => { sevCounts[r.severity] = r.count; });

  // 2. Reconciliation mismatches (ledger vs accounting)
  const mismatchQuery = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM (
      SELECT fl.id
      FROM financial_ledger fl
      JOIN accounting_entries ae ON ae.ledger_entry_id = fl.id
      WHERE fl.event_type IN ('invoice_finalized','payment_confirmed','commission_settled')
        AND ABS(ae.amount - fl.amount) > 0.001
    ) mismatches
  `);
  const mismatchedCount = mismatchQuery.rows[0].count;

  // 3. Expense volatility: standard deviation of monthly expense totals (last 4 months)
  let expenseStdDev = 0;
  try {
    const monthlyExp = await pool.query(`
      WITH monthly AS (
        SELECT date_trunc('month', expense_date) AS month, SUM(amount) AS total
        FROM expenses
        WHERE expense_date >= CURRENT_DATE - INTERVAL '4 months'
        GROUP BY month
      )
      SELECT STDDEV(total) AS stddev FROM monthly
    `);
    expenseStdDev = parseFloat(monthlyExp.rows[0]?.stddev || 0);
  } catch (e) { expenseStdDev = 0; }

  // 4. Anomaly density: active alerts / total accounting entries (scaled)
  const totalEntries = await pool.query('SELECT COUNT(*)::int AS count FROM accounting_entries');
  const totalCount = totalEntries.rows[0].count;
  const anomalyDensity = totalCount > 0
    ? (sevCounts.HIGH + sevCounts.MEDIUM + sevCounts.LOW) / totalCount
    : 0;

  // --- Compute risk score (0-100, higher = safer) ---
  let score = 100;
  score -= sevCounts.HIGH * 15;
  score -= sevCounts.MEDIUM * 5;
  score -= sevCounts.LOW * 2;
  score -= mismatchedCount * 10;
  score -= Math.min(expenseStdDev / 1000, 20);  // cap expense penalty
  score -= Math.min(anomalyDensity * 200, 20);  // cap density penalty
  score = Math.max(0, Math.min(100, score));

  // --- Trend: 7 days average anomaly count vs today ---
  let trend = 'stable';
  try {
    const dailyAlerts = await pool.query(`
      SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS cnt
      FROM control_alerts
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY day
      ORDER BY day DESC
    `);
    const todayCount = dailyAlerts.rows.length > 0 ? dailyAlerts.rows[0].cnt : 0;
    const avg7d = dailyAlerts.rows.reduce((s, r) => s + r.cnt, 0) / Math.max(dailyAlerts.rows.length, 1);
    if (todayCount > avg7d * 1.5) trend = 'worsening';
    else if (todayCount < avg7d * 0.5) trend = 'improving';
  } catch (e) { trend = 'unknown'; }

  let status;
  if (score >= 90) status = 'STABLE';
  else if (score >= 70) status = 'WARNING';
  else status = 'CRITICAL';

  return {
    score,
    status,
    trend,
    breakdown: {
      alertSeverity: sevCounts,
      mismatchedLedgerEntries: mismatchedCount,
      expenseStdDev: parseFloat(expenseStdDev.toFixed(2)),
      anomalyDensity: parseFloat(anomalyDensity.toFixed(4)),
    },
  };
}

module.exports = { getRiskScore };