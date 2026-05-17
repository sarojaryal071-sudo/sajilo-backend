// sajilo-backend/src/modules/accounting/accountingIdempotencyService.js
const crypto = require('crypto');
const { pool } = require('../../config/database');

/**
 * Generate a deterministic hash from source event data.
 * @param {object} source - { source_type, source_id, event_type, amount }
 * @returns {string} SHA256 hex digest
 */
function generateHash({ source_type, source_id, event_type, amount }) {
  const raw = `${source_type}|${source_id || ''}|${event_type}|${amount}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Check if an event has already been processed.
 * @param {string} hash
 * @returns {boolean} true if already processed
 */
async function isProcessed(hash) {
  const result = await pool.query(
    'SELECT id FROM accounting_idempotency WHERE hash = $1',
    [hash]
  );
  return result.rows.length > 0;
}

/**
 * Mark an event as processed (idempotency record).
 * @param {object} params - { source_type, source_id, event_type, hash }
 * @returns {object} inserted row
 */
async function markProcessed({ source_type, source_id, event_type, hash }) {
  const result = await pool.query(
    `INSERT INTO accounting_idempotency (source_type, source_id, event_type, hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (hash) DO NOTHING
     RETURNING *`,
    [source_type, source_id || null, event_type, hash]
  );
  return result.rows[0] || null;
}

module.exports = { generateHash, isProcessed, markProcessed };