// sajilo-backend/src/modules/control/controlDashboardService.js
const { pool } = require('../../config/database');

async function getDashboardData() {
  // 1. Anomaly summary (alerts table)
  const alertStats = await pool.query(
    `SELECT severity, COUNT(*)::int AS count
     FROM control_alerts
     WHERE status = 'ACTIVE' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY severity`
  );
  const severityCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  alertStats.rows.forEach(r => { severityCounts[r.severity] = r.count; });
  const totalAnomalies = severityCounts.HIGH + severityCounts.MEDIUM + severityCounts.LOW;

  // 2. Alert summary (active alerts by type)
  const typeBreakdown = await pool.query(
    `SELECT alert_type, COUNT(*)::int AS count
     FROM control_alerts
     WHERE status = 'ACTIVE'
     GROUP BY alert_type`
  );

  // 3. Reconciliation mismatch count (ledger vs accounting mismatches)
  const mismatchQuery = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM (
      SELECT fl.id, fl.amount AS ledger_amt, ae.amount AS acc_amt
      FROM financial_ledger fl
      JOIN accounting_entries ae ON ae.ledger_entry_id = fl.id
      WHERE fl.event_type IN ('invoice_finalized','payment_confirmed','commission_settled')
        AND ABS(ae.amount - fl.amount) > 0.001
    ) mismatches
  `);
  const mismatchedCount = mismatchQuery.rows[0].count;

  // 4. Expense volatility: count expense spikes in the last 30 days (alerts of type EXPENSE_SPIKE_ALERT or VENDOR_ANOMALY_ALERT)
  const expenseAlerts = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM control_alerts
     WHERE alert_type IN ('EXPENSE_SPIKE_ALERT', 'VENDOR_ANOMALY_ALERT')
       AND created_at >= CURRENT_DATE - INTERVAL '30 days'`
  );
  const expenseSpikeCount = expenseAlerts.rows[0].count;

  // ---- Compute Risk Score (0-100) ----
  let score = 100;
  score -= severityCounts.HIGH * 15;
  score -= severityCounts.MEDIUM * 5;
  score -= severityCounts.LOW * 2;
  score -= mismatchedCount * 10;
  score -= expenseSpikeCount * 10;
  score = Math.max(0, Math.min(100, score));

  let status;
  if (score >= 70) status = 'OK';
  else if (score >= 50) status = 'WARNING';
  else status = 'CRITICAL';

  // Top issues: list active HIGH alerts, if any, else top MEDIUM alerts
  const topIssuesQuery = await pool.query(
    `SELECT title, description, severity, alert_type
     FROM control_alerts
     WHERE status = 'ACTIVE'
     ORDER BY CASE severity WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, created_at DESC
     LIMIT 10`
  );

  return {
    riskScore: score,
    status,
    anomalySummary: {
      totalAnomalies,
      severityCounts,
    },
    alertSummary: {
      totalActive: totalAnomalies,
      byType: typeBreakdown.rows,
    },
    topIssues: topIssuesQuery.rows,
    metrics: {
      mismatchedLedgerEntries: mismatchedCount,
      expenseSpikes: expenseSpikeCount,
    },
  };
}

module.exports = { getDashboardData };