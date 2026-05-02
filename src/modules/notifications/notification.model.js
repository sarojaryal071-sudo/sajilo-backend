const { pool } = require('../../config/database')

// Creates a notification in the database
async function create({ title, message, priority, targetType, targetCategory, createdBy }) {
  const result = await pool.query(
    `INSERT INTO notifications (title, message, priority, target_type, target_category, created_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'sent')
     RETURNING *`,
    [title, message, priority, targetType, targetCategory, createdBy]
  )
  return result.rows[0]
}

// Gets all notifications with optional limit
async function getAll(limit = 50) {
  const result = await pool.query(
    `SELECT * FROM notifications ORDER BY created_at DESC LIMIT $1`,
    [limit]
  )
  return result.rows
}

// Gets notifications for a specific user — for notification center
async function getByUser(userId, limit = 20) {
  const result = await pool.query(
    `SELECT * FROM notifications 
     WHERE target_type = 'user' 
     ORDER BY created_at DESC LIMIT $1`,
    [limit]
  )
  return result.rows
}

// Counts unread notifications for a user — for badge display
async function getUnreadCount(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM notifications 
     WHERE target_type = 'user' AND status = 'sent'`,
    []
  )
  return parseInt(result.rows[0]?.count || 0)
}

// Marks a notification as read
async function markAsRead(notificationId) {
  await pool.query(
    `UPDATE notifications SET status = 'read' WHERE id = $1`,
    [notificationId]
  )
}

module.exports = { create, getAll, getByUser, getUnreadCount, markAsRead }