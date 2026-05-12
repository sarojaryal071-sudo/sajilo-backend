// sajilo-backend/src/modules/admin/moderation.service.js
const { pool } = require('../../config/database');

/**
 * Log an admin moderation action (suspend, unsuspend, flag for review).
 * @param {Object} params
 * @param {number} params.actorId      - Admin user ID who performed the action
 * @param {number} params.targetId     - User ID of the worker or client being moderated
 * @param {string} params.targetRole   - 'worker' or 'customer'
 * @param {string} params.action       - 'suspend', 'unsuspend', 'flag_review'
 * @param {string} params.previousStatus - Status before the action (e.g., 'active')
 * @param {string} params.newStatus    - Resulting moderation status (e.g., 'suspended')
 * @param {string} [params.note]       - Admin's reason / explanation
 * @param {Object} [params.metadata]   - Extra context (IP, etc.)
 * @returns {Object} the inserted moderation_actions row
 */
async function logModerationAction({
  actorId,
  targetId,
  targetRole,
  action,
  previousStatus = null,
  newStatus,
  note = null,
  metadata = null,
}) {
  if (!actorId || !targetId || !targetRole || !action || !newStatus) {
    throw new Error('actorId, targetId, targetRole, action, and newStatus are required');
  }

  const result = await pool.query(
    `INSERT INTO moderation_actions
      (actor_id, target_id, target_role, action, previous_status, new_status, note, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING *`,
    [
      actorId,
      targetId,
      targetRole,
      action,
      previousStatus,
      newStatus,
      note,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
  return result.rows[0];
}

module.exports = { logModerationAction };