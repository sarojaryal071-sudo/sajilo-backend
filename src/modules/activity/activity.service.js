// sajilo-backend/src/modules/activity/activity.service.js
const { pool } = require('../../config/database');

/**
 * Log a system activity event.
 * @param {Object} params
 * @param {string}  params.type       - 'booking', 'payment', 'user', 'admin', 'system', 'moderation', 'ticket'
 * @param {string}  params.action     - 'created', 'updated', 'deleted', 'completed', 'failed'
 * @param {string}  [params.entityType] - e.g., 'booking', 'payment', 'user', 'ticket'
 * @param {number}  [params.entityId]   - ID of the affected entity
 * @param {string}  params.title      - Human‑readable summary
 * @param {Object}  [params.metadata] - Extra context in JSON
 * @param {number}  [params.createdBy] - User ID who triggered the activity
 * @returns {Object} the inserted activity row
 */
async function logActivity({ type, action, entityType = null, entityId = null, title, metadata = null, createdBy = null }) {
  if (!type || !action || !title) {
    throw new Error('type, action, and title are required for activity logging');
  }

  const result = await pool.query(
    `INSERT INTO system_activity_log
      (type, action, entity_type, entity_id, title, metadata, created_by)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
     RETURNING *`,
    [
      type,
      action,
      entityType,
      entityId,
      title,
      metadata ? JSON.stringify(metadata) : null,
      createdBy || null,
    ]
  );
  return result.rows[0];
}

module.exports = { logActivity };