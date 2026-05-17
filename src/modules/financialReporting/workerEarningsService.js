const { pool } = require('../../config/database');

async function getWorkerEarnings({ from, to }) {
  let query = `SELECT 
                 fl.worker_id,
                 u.name AS worker_name,
                 SUM(ae.amount)::numeric(12,2) AS total_earned
               FROM accounting_entries ae
               JOIN financial_ledger fl ON ae.ledger_entry_id = fl.id
               LEFT JOIN users u ON fl.worker_id = u.id
               WHERE ae.entry_type IN ('AUTO','AUTO_BACKFILL')
                 AND ae.credit_account = 'WORKER_PAYABLE'`;
  const params = [];
  if (from) { params.push(from); query += ` AND ae.created_at >= $${params.length}`; }
  if (to)   { params.push(to);   query += ` AND ae.created_at <= $${params.length}`; }
  query += ` GROUP BY fl.worker_id, u.name ORDER BY total_earned DESC`;

  const { rows } = await pool.query(query, params);
  return rows;
}

module.exports = { getWorkerEarnings };