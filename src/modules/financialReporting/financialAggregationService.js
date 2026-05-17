const { pool } = require('../../config/database');

async function getAccountingEntriesByPeriod({ from, to }) {
  let query = `SELECT ae.*, a.type AS account_type, a.code AS account_code
               FROM accounting_entries ae
               JOIN accounts a ON ae.debit_account = a.code OR ae.credit_account = a.code
               WHERE 1=1`;
  const params = [];
  if (from) { params.push(from); query += ` AND ae.created_at >= $${params.length}`; }
  if (to)   { params.push(to);   query += ` AND ae.created_at <= $${params.length}`; }
  query += ' ORDER BY ae.created_at';

  const { rows } = await pool.query(query, params);
  return rows;
}

module.exports = { getAccountingEntriesByPeriod };