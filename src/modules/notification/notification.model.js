// sajilo-backend/src/modules/notifications/notifications.model.js
const { pool } = require('../../config/database');

/**
 * Insert a new notification.
 * @param {Object} data - { user_id, user_role, type, title, message, entity_type, entity_id, metadata }
 * @returns {Object} created notification row
 */
async function create(data) {
  const {
    user_id,
    user_role,
    type,
    title,
    message,
    entity_type = null,
    entity_id = null,
    metadata = null,
  } = data;

  const result = await pool.query(
    `INSERT INTO notifications 
       (user_id, user_role, type, title, message, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [user_id, user_role, type, title, message, entity_type, entity_id, metadata]
  );
  return result.rows[0];
}

/**
 * Fetch unread notifications for a user, ordered by newest first.
 * @param {number} userId
 * @param {string} userRole
 * @param {number} limit - optional, defaults to 50
 * @returns {Array}
 */
async function getUnreadByUser(userId, userRole, limit = 50) {
  const result = await pool.query(
    `SELECT * FROM notifications 
     WHERE user_id = $1 AND user_role = $2 AND is_read = false
     ORDER BY created_at DESC
     LIMIT $3`,
    [userId, userRole, limit]
  );
  return result.rows;
}

/**
 * Fetch all notifications for a user, newest first.
 * @param {number} userId
 * @param {string} userRole
 * @param {number} limit - optional, defaults to 100
 * @returns {Array}
 */
async function getByUser(userId, userRole, limit = 100) {
  const result = await pool.query(
    `SELECT * FROM notifications 
     WHERE user_id = $1 AND user_role = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [userId, userRole, limit]
  );
  return result.rows;
}

/**
 * Mark a single notification as read.
 * @param {number} notificationId
 * @returns {Object} updated notification
 */
async function markRead(notificationId) {
  const result = await pool.query(
    `UPDATE notifications 
     SET is_read = true, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [notificationId]
  );
  return result.rows[0] || null;
}

/**
 * Mark all notifications for a user as read.
 * @param {number} userId
 * @param {string} userRole
 */
async function markAllRead(userId, userRole) {
  await pool.query(
    `UPDATE notifications 
     SET is_read = true, updated_at = NOW()
     WHERE user_id = $1 AND user_role = $2 AND is_read = false`,
    [userId, userRole]
  );
}

/**
 * Get unread count for a user.
 * @param {number} userId
 * @param {string} userRole
 * @returns {number} count
 */
async function getUnreadCount(userId, userRole) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications 
     WHERE user_id = $1 AND user_role = $2 AND is_read = false`,
    [userId, userRole]
  );
  return result.rows[0]?.count || 0;
}

module.exports = {
  create,
  getUnreadByUser,
  getByUser,
  markRead,
  markAllRead,
  getUnreadCount,
};