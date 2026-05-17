// sajilo-backend/src/modules/control/anomalyEngine.js
const { pool } = require('../../config/database');

async function detectAnomalies() {
  const anomalies = [];

  // ========== A) EXPENSE ANOMALIES ==========

  // 1. Sudden expense spikes by category (monthly totals)
  try {
    const spikeQuery = await pool.query(`
      WITH monthly AS (
        SELECT
          ec.name AS category,
          date_trunc('month', e.expense_date) AS month,
          SUM(e.amount) AS total
        FROM expenses e
        JOIN expense_categories ec ON e.category_id = ec.id
        WHERE e.expense_date >= CURRENT_DATE - INTERVAL '4 months'
        GROUP BY ec.name, date_trunc('month', e.expense_date)
      ),
      avg_prev AS (
        SELECT category, month, total,
          AVG(total) OVER (PARTITION BY category ORDER BY month ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) AS avg_prev_3
        FROM monthly
      )
      SELECT category, month, total, avg_prev_3
      FROM avg_prev
      WHERE avg_prev_3 > 0 AND total > 3 * avg_prev_3
      ORDER BY month DESC
    `);
    for (const row of spikeQuery.rows) {
      anomalies.push({
        type: 'EXPENSE_SPIKE',
        severity: 'MEDIUM',
        source: `Category: ${row.category}`,
        description: `Expense total for ${row.category} in ${row.month.toISOString().slice(0,7)} is Rs ${row.total} vs avg Rs ${parseFloat(row.avg_prev_3).toFixed(2)} (previous 3 months)`,
        evidence: [row],
        suggested_reason: 'Possible one-time large purchase or misclassification'
      });
    }
  } catch (e) { console.error('Anomaly: expense spike error', e); }

  // 2. High vendor spending (vs last 3 months average)
  try {
    const vendorSpikeQuery = await pool.query(`
      WITH vendor_monthly AS (
        SELECT v.name AS vendor, date_trunc('month', e.expense_date) AS month,
          SUM(e.amount) AS total
        FROM expenses e
        JOIN vendors v ON e.vendor_id = v.id
        WHERE e.expense_date >= CURRENT_DATE - INTERVAL '4 months'
        GROUP BY v.name, month
      ),
      avg_vendor AS (
        SELECT vendor, month, total,
          AVG(total) OVER (PARTITION BY vendor ORDER BY month ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) AS avg_prev
        FROM vendor_monthly
      )
      SELECT vendor, month, total, avg_prev
      FROM avg_vendor
      WHERE avg_prev > 0 AND total > 2 * avg_prev
      ORDER BY month DESC
    `);
    for (const row of vendorSpikeQuery.rows) {
      anomalies.push({
        type: 'VENDOR_SPIKE',
        severity: 'MEDIUM',
        source: `Vendor: ${row.vendor}`,
        description: `Spending on ${row.vendor} in ${row.month.toISOString().slice(0,7)} is Rs ${row.total} vs avg Rs ${parseFloat(row.avg_prev).toFixed(2)}`,
        evidence: [row],
        suggested_reason: 'Unusual vendor billing or new large contract'
      });
    }
  } catch (e) { console.error('Anomaly: vendor spike error', e); }

  // 3. Duplicate vendor charges (same vendor, similar amount, within 3 days)
  try {
    const dupVendorQuery = await pool.query(`
      SELECT e1.id AS id1, e2.id AS id2, v.name AS vendor,
        e1.amount AS amt1, e2.amount AS amt2,
        e1.expense_date AS date1, e2.expense_date AS date2
      FROM expenses e1
      JOIN expenses e2 ON e1.vendor_id = e2.vendor_id AND e1.id < e2.id
      JOIN vendors v ON e1.vendor_id = v.id
      WHERE e1.expense_date >= CURRENT_DATE - INTERVAL '30 days'
        AND ABS(e1.amount - e2.amount) / NULLIF(e1.amount,0) < 0.02
        AND ABS(e2.expense_date - e1.expense_date) <= 3
      ORDER BY e1.expense_date DESC
      LIMIT 20
    `);
    for (const row of dupVendorQuery.rows) {
      anomalies.push({
        type: 'DUPLICATE_VENDOR_CHARGE',
        severity: 'MEDIUM',
        source: `Vendor: ${row.vendor}`,
        description: `Two expenses to ${row.vendor} on ${row.date1.toISOString().slice(0,10)} and ${row.date2.toISOString().slice(0,10)} with amounts Rs ${row.amt1} and Rs ${row.amt2}`,
        evidence: [row],
        suggested_reason: 'Possible duplicate billing – verify with vendor'
      });
    }
  } catch (e) { console.error('Anomaly: duplicate vendor error', e); }

  // ========== B) LEDGER ANOMALIES ==========

  // 1. Transaction volume spike (daily count vs 7-day moving average)
  try {
    const volumeQuery = await pool.query(`
      WITH daily AS (
        SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS cnt
        FROM financial_ledger
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY day
      ),
      avg_daily AS (
        SELECT day, cnt,
          AVG(cnt) OVER (ORDER BY day ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING) AS avg_7d
        FROM daily
      )
      SELECT day, cnt, avg_7d
      FROM avg_daily
      WHERE avg_7d > 0 AND cnt > 3 * avg_7d
      ORDER BY day DESC
    `);
    for (const row of volumeQuery.rows) {
      anomalies.push({
        type: 'LEDGER_VOLUME_SPIKE',
        severity: 'MEDIUM',
        source: 'financial_ledger',
        description: `Ledger transaction count on ${row.day.toISOString().slice(0,10)} was ${row.cnt} vs 7-day avg ${parseFloat(row.avg_7d).toFixed(1)}`,
        evidence: [row],
        suggested_reason: 'Possible system event, bulk processing, or attack'
      });
    }
  } catch (e) { console.error('Anomaly: ledger volume error', e); }

  // 2. Negative CASH balance pattern
  try {
    const cashBalanceQuery = await pool.query(`
      WITH cash_flows AS (
        SELECT
          SUM(amount) FILTER (WHERE debit_account = 'CASH') AS debits,
          SUM(amount) FILTER (WHERE credit_account = 'CASH') AS credits
        FROM accounting_entries
      )
      SELECT debits, credits, (debits - credits) AS balance
      FROM cash_flows
    `);
    const { debits, credits, balance } = cashBalanceQuery.rows[0];
    if (parseFloat(balance) < 0) {
      anomalies.push({
        type: 'NEGATIVE_CASH_BALANCE',
        severity: 'HIGH',
        source: 'CASH account',
        description: `Cash account shows negative balance Rs ${balance} (Debits: ${debits}, Credits: ${credits})`,
        evidence: [{ debits, credits, balance }],
        suggested_reason: 'Possible missing deposit or erroneous credit entry'
      });
    }
  } catch (e) { console.error('Anomaly: negative cash error', e); }

  // ========== C) ACCOUNTING ANOMALIES ==========

    // 1. Duplicate accounting entries (same source reference → real double‑posting)
  try {
    const { rows } = await pool.query(`
      SELECT ae1.id AS id1, ae2.id AS id2,
             ae1.debit_account, ae1.credit_account, ae1.amount,
             ae1.created_at AS t1, ae2.created_at AS t2
      FROM accounting_entries ae1
      JOIN accounting_entries ae2 ON ae1.id < ae2.id
        AND ae1.debit_account = ae2.debit_account
        AND ae1.credit_account = ae2.credit_account
        AND ae1.amount = ae2.amount
      WHERE (
        (ae1.ledger_entry_id IS NOT NULL AND ae1.ledger_entry_id = ae2.ledger_entry_id) OR
        (ae1.expense_id IS NOT NULL AND ae1.expense_id = ae2.expense_id) OR
        (ae1.journal_id IS NOT NULL AND ae1.journal_id = ae2.journal_id)
      )
      ORDER BY ae1.created_at DESC
      LIMIT 20
    `);
    rows.forEach(r => anomalies.push({
      type: 'DUPLICATE_ACCOUNTING_ENTRY', severity: 'HIGH',
      source: 'accounting_entries',
      description: `Duplicate entries #${r.id1.slice(0,8)} and #${r.id2.slice(0,8)}: ${r.debit_account}→${r.credit_account} Rs ${r.amount} share the same source reference`,
      evidence: [r],
      suggested_reason: 'Possible double‑posting – verify transaction'
    }));
  } catch (e) { console.error('Anomaly: duplicate accounting', e); }

  
  // 2. Orphan entries (no source link) – already in integrity report but include here
  try {
    const orphanQuery = await pool.query(`
      SELECT id, entry_type, debit_account, credit_account, amount, created_at
      FROM accounting_entries
      WHERE ledger_entry_id IS NULL AND expense_id IS NULL AND journal_id IS NULL
      ORDER BY created_at DESC
      LIMIT 20
    `);
    for (const row of orphanQuery.rows) {
      anomalies.push({
        type: 'ORPHAN_ACCOUNTING_ENTRY',
        severity: 'MEDIUM',
        source: 'accounting_entries',
        description: `Orphan entry #${row.id.slice(0,8)} (${row.debit_account}→${row.credit_account} Rs ${row.amount}) has no source link`,
        evidence: [row],
        suggested_reason: 'Missing ledger/expense/journal reference – data integrity issue'
      });
    }
  } catch (e) { console.error('Anomaly: orphan error', e); }

  // ========== Summary ==========
  const severityCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const a of anomalies) {
    severityCounts[a.severity] = (severityCounts[a.severity] || 0) + 1;
  }

  const grouped = {};
  for (const a of anomalies) {
    if (!grouped[a.type]) grouped[a.type] = [];
    grouped[a.type].push(a);
  }

  return {
    totalAnomalies: anomalies.length,
    severitySummary: severityCounts,
    groupedByType: grouped,
    all: anomalies
  };
}

module.exports = { detectAnomalies };