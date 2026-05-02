const notificationModel = require('./notification.model')
const { pool } = require('../../config/database')

// Resolves which worker IDs should receive a notification based on target type
async function resolveRecipients(targetType, targetCategory) {
  if (targetType === 'all') {
    const result = await pool.query(
      `SELECT id FROM users WHERE role = 'worker' AND status = 'active'`
    )
    return result.rows.map(r => r.id)
  }

  if (targetType === 'online') {
    const result = await pool.query(
      `SELECT id FROM users WHERE role = 'worker' AND status = 'active' AND is_online = true`
    )
    return result.rows.map(r => r.id)
  }

  if (targetType === 'category') {
    const result = await pool.query(
      `SELECT id FROM users WHERE role = 'worker' AND status = 'active' AND $1 = ANY(skills)`,
      [targetCategory]
    )
    return result.rows.map(r => r.id)
  }

  return []
}

// Sends a notification to workers based on admin-defined target criteria
async function sendNotification(payload, adminId) {
  const { title, message, priority, target } = payload

  const notification = await notificationModel.create({
    title,
    message,
    priority: priority || 'normal',
    targetType: target.type,
    targetCategory: target.category || null,
    createdBy: adminId,
  })

  const workerIds = await resolveRecipients(target.type, target.category)

  const { getIO } = require('../realtime/socket')
  const io = getIO()
  if (io) {
    workerIds.forEach(workerId => {
      io.to(`user:${workerId}`).emit('notification', {
        id: notification.id,
        title,
        message,
        priority,
      })
    })
  }

  return {
    notification,
    recipientCount: workerIds.length,
  }
}

// Sends a direct notification to a single user — used by chat, status updates, and booking events
async function sendToUser(userId, { title, message, priority = 'normal' }) {
  const notification = await notificationModel.create({
    title,
    message,
    priority,
    targetType: 'user',
    targetCategory: null,
    createdBy: null,
  })

  const { getIO } = require('../realtime/socket')
  const io = getIO()
  if (io) {
    io.to(`user:${userId}`).emit('notification_new', {
      id: notification.id,
      title,
      message,
      priority,
      type: 'direct',
    })
  }

  return notification
}

module.exports = { sendNotification, sendToUser }