const { pool } = require('../../config/database');

async function getConfig() {
  const result = await pool.query('SELECT config FROM ui_config WHERE id = 1');
  return result.rows[0]?.config || {};
}

async function updateConfig(config) {
  const result = await pool.query(
    `UPDATE ui_config SET config = $1, updated_at = NOW() WHERE id = 1 RETURNING config`,
    [JSON.stringify(config)]
  );
  return result.rows[0]?.config || {};
}

module.exports = { getConfig, updateConfig };