// sajilo-backend/src/modules/admin/policy.service.js
const { pool } = require('../../config/database');

/**
 * Get a single policy value by key.
 * @param {string} key
 * @param {*} defaultValue - returned if key not found
 * @returns {*} the parsed JSON value or defaultValue
 */
async function getPolicy(key, defaultValue = null) {
  const result = await pool.query(
    'SELECT value FROM platform_policies WHERE key = $1',
    [key]
  );
  if (result.rows.length === 0) return defaultValue;
  return result.rows[0].value;  // JSONB is auto‑parsed by pg
}

/**
 * Upsert a policy.
 * @param {string} key
 * @param {*} value          - any JSON‑serializable value
 * @param {string} [description]
 * @param {number} [updatedBy] - admin user ID
 * @returns {Object} the upserted row
 */
async function setPolicy(key, value, description = null, updatedBy = null) {
  if (!key) throw new Error('Policy key is required');

  const result = await pool.query(
    `INSERT INTO platform_policies (key, value, description, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, $4, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = $2::jsonb,
           description = COALESCE($3, platform_policies.description),
           updated_by = $4,
           updated_at = NOW()
     RETURNING *`,
    [key, JSON.stringify(value), description, updatedBy]
  );
  return result.rows[0];
}

/**
 * Get all policies.
 * @returns {Array}
 */
async function getAllPolicies() {
  const result = await pool.query(
    'SELECT * FROM platform_policies ORDER BY key'
  );
  return result.rows;
}

module.exports = { getPolicy, setPolicy, getAllPolicies };