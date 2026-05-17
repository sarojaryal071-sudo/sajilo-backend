// sajilo-backend/src/modules/control/alertEngine.js
const crypto = require('crypto');
const { pool } = require('../../config/database');
const { detectAnomalies } = require('./anomalyEngine');

const ALERT_TYPE_MAP = {
  'EXPENSE_SPIKE':               'EXPENSE_SPIKE_ALERT',
  'VENDOR_SPIKE':                'VENDOR_ANOMALY_ALERT',
  'DUPLICATE_VENDOR_CHARGE':     'VENDOR_ANOMALY_ALERT',
  'LEDGER_VOLUME_SPIKE':         'REVENUE_DROP_ALERT',
  'NEGATIVE_CASH_BALANCE':       'ACCOUNTING_MISMATCH_ALERT',
  'DUPLICATE_ACCOUNTING_ENTRY':  'ACCOUNTING_MISMATCH_ALERT',
  'ORPHAN_ACCOUNTING_ENTRY':     'ACCOUNTING_MISMATCH_ALERT',
};

function generateHash(anomaly) {
  const raw = `${anomaly.type}|${anomaly.source}|${anomaly.description}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function generateAlerts() {
  const { all: anomalies } = await detectAnomalies();
  const newAlerts = [];

  for (const a of anomalies) {
    const hash = generateHash(a);
    const alertType = ALERT_TYPE_MAP[a.type] || 'ACCOUNTING_MISMATCH_ALERT';

    // Skip if already exists
    const existing = await pool.query('SELECT id FROM control_alerts WHERE anomaly_hash = $1', [hash]);
    if (existing.rows.length > 0) continue;

    const result = await pool.query(
      `INSERT INTO control_alerts (alert_type, severity, title, description, source, evidence, anomaly_hash, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE')
       RETURNING *`,
      [alertType, a.severity, a.type.replace(/_/g,' '), a.description, a.source, JSON.stringify(a.evidence), hash]
    );
    newAlerts.push(result.rows[0]);
  }

  return newAlerts;
}

async function listAlerts(status = null) {
  let query = 'SELECT * FROM control_alerts';
  const params = [];
  if (status) {
    params.push(status);
    query += ' WHERE status = $1';
  }
  query += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(query, params);
  return rows;
}

async function acknowledgeAlert(id, userId) {
  const result = await pool.query(
    `UPDATE control_alerts SET status = 'ACKNOWLEDGED', acknowledged_by = $2, acknowledged_at = NOW()
     WHERE id = $1 AND status = 'ACTIVE'
     RETURNING *`,
    [id, userId]
  );
  return result.rows[0] || null;
}

module.exports = { generateAlerts, listAlerts, acknowledgeAlert };