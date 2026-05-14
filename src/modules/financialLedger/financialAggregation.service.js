const { pool } = require('../../config/database');

async function getFinancialOverview() {
  const result = await pool.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE event_type = 'invoice_finalized'), 0) AS total_invoiced,
       COALESCE(SUM(amount) FILTER (WHERE event_type = 'payment_confirmed'), 0) AS total_collected,
       COALESCE(SUM((metadata->>'commission_amount')::numeric) FILTER (WHERE event_type = 'invoice_finalized'), 0) AS total_commission,
       COALESCE(SUM(amount) FILTER (WHERE event_type = 'settlement_recorded'), 0) AS total_settled
     FROM financial_ledger`
  );
  const row = result.rows[0];
  return {
    totalInvoiced: parseFloat(row.total_invoiced) || 0,
    totalCollected: parseFloat(row.total_collected) || 0,
    totalCommission: parseFloat(row.total_commission) || 0,
    totalSettled: parseFloat(row.total_settled) || 0,
    outstandingCommission: Math.round(
      ((parseFloat(row.total_commission) || 0) - (parseFloat(row.total_settled) || 0)) * 100
    ) / 100,
  };
}

async function getWorkerDueList() {
  const result = await pool.query(
    `SELECT
       u.id, u.name, u.client_id,
       COALESCE(SUM(fl.amount) FILTER (WHERE fl.event_type = 'invoice_finalized'), 0) AS gross_earnings,
       COALESCE(SUM((fl.metadata->>'commission_amount')::numeric) FILTER (WHERE fl.event_type = 'invoice_finalized'), 0) AS commission_owed,
       COALESCE(SUM(fl.amount) FILTER (WHERE fl.event_type = 'settlement_recorded'), 0) AS commission_paid,
       MAX(fl.created_at) FILTER (WHERE fl.event_type = 'settlement_recorded') AS last_settlement
     FROM users u
     LEFT JOIN financial_ledger fl ON fl.worker_id = u.id
     WHERE u.role = 'worker'
     GROUP BY u.id
     HAVING COALESCE(SUM((fl.metadata->>'commission_amount')::numeric) FILTER (WHERE fl.event_type = 'invoice_finalized'), 0) > 0
     ORDER BY (COALESCE(SUM((fl.metadata->>'commission_amount')::numeric) FILTER (WHERE fl.event_type = 'invoice_finalized'), 0) - COALESCE(SUM((fl.metadata->>'commission_amount')::numeric) FILTER (WHERE fl.event_type = 'commission_settled'), 0)) DESC`
  );
  return result.rows.map(r => ({
    workerId: r.id,
    workerName: r.name,
    workerClientId: r.client_id,
    grossEarnings: parseFloat(r.gross_earnings) || 0,
    commissionOwed: parseFloat(r.commission_owed) || 0,
    commissionPaid: parseFloat(r.commission_paid) || 0,
    balanceDue: Math.round(
      ((parseFloat(r.commission_owed) || 0) - (parseFloat(r.commission_paid) || 0)) * 100
    ) / 100,
    lastSettlement: r.last_settlement || null,
  }));
}

module.exports = { getFinancialOverview, getWorkerDueList };