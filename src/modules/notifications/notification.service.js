const notificationModel = require('./notification.model')
const { pool } = require('../../config/database')

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

async function sendNotification(payload, adminId) {
  const { title, message, priority, target } = payload

  // Save to database
  const notification = await notificationModel.create({
    title,
    message,
    priority: priority || 'normal',
    targetType: target.type,
    targetCategory: target.category || null,
    createdBy: adminId,
  })

  // Resolve recipients
  const workerIds = await resolveRecipients(target.type, target.category)

  // Emit via socket
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

module.exports = { sendNotification }