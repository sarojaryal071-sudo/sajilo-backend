// sajilo-backend/src/modules/audit/audit.service.js
const { pool } = require('../../config/database');

/**
 * Record an administrative or system event in the audit log.
 * @param {Object} params
 * @param {number|null} params.actorId      - User ID who performed the action (null for system)
 * @param {string}      params.actorRole    - 'admin', 'worker', 'customer', 'system'
 * @param {string}      params.action       - e.g. 'payment.status_change', 'admin.config_update'
 * @param {string}      params.entityType   - 'booking', 'payment', 'user', 'config', etc.
 * @param {number|null} params.entityId     - ID of the affected entity
 * @param {Object|null} params.oldValue     - snapshot before the change
 * @param {Object|null} params.newValue     - snapshot after the change
 * @param {Object|null} params.metadata     - extra context (IP, reason, etc.)
 * @returns {Object} the inserted row
 */
async function logAction({
  actorId = null,
  actorRole,
  action,
  entityType = null,
  entityId = null,
  oldValue = null,
  newValue = null,
  metadata = null,
}) {
  if (!actorRole || !action) {
    throw new Error('actorRole and action are required for audit logging');
  }

  const result = await pool.query(
    `INSERT INTO audit_logs
      (actor_id, actor_role, action, entity_type, entity_id, old_value, new_value, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
     RETURNING *`,
    [
      actorId,
      actorRole,
      action,
      entityType,
      entityId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
  return result.rows[0];
}

module.exports = { logAction };