// sajilo-backend/src/modules/accounting/accountMappingService.js
const { pool } = require('../../config/database');

const TABLE = 'account_mapping_rules';

async function getRuleByEvent(eventType) {
  const result = await pool.query(
    `SELECT id, event_type, debit_account, credit_account, condition, is_active
     FROM ${TABLE}
     WHERE event_type = $1 AND is_active = true
     ORDER BY id DESC LIMIT 1`,
    [eventType]
  );
  return result.rows[0] || null;
}

async function listRules() {
  const result = await pool.query(
    `SELECT id, event_type, debit_account, credit_account, condition, is_active
     FROM ${TABLE}
     ORDER BY event_type, id`
  );
  return result.rows;
}

async function createRule({ event_type, debit_account, credit_account, condition, is_active = true }) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (event_type, debit_account, credit_account, condition, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [event_type, debit_account, credit_account, condition || null, is_active]
  );
  return result.rows[0];
}

async function updateRule(id, { event_type, debit_account, credit_account, condition, is_active }) {
  const result = await pool.query(
    `UPDATE ${TABLE}
     SET event_type = COALESCE($2, event_type),
         debit_account = COALESCE($3, debit_account),
         credit_account = COALESCE($4, credit_account),
         condition = COALESCE($5, condition),
         is_active = COALESCE($6, is_active)
     WHERE id = $1
     RETURNING *`,
    [id, event_type, debit_account, credit_account, condition, is_active]
  );
  return result.rows[0] || null;
}

module.exports = {
  getRuleByEvent,
  listRules,
  createRule,
  updateRule,
};