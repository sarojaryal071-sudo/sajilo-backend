// sajilo-backend/src/modules/notifications/notificationSocket.js
const { getIO } = require('../realtime/socket');
const { pool } = require('../../config/database');
const { getUserRoom } = require('../../utils/socketRooms');

/**
 * Emit a notification.created event to the target user's socket room.
 * @param {Object} notification - the full notification row from the database
 */
async function emitNotification(notification) {
  const io = getIO();
  if (!io) return;

  try {
    // Look up the user's client_id to build the room name
    const userResult = await pool.query(
      'SELECT client_id FROM users WHERE id = $1',
      [notification.user_id]
    );
    const clientId = userResult.rows[0]?.client_id || `U${notification.user_id}`;
    const room = `user:${clientId}`;

    console.log('[notification.emit]', room, notification.id, new Date().toISOString());


    io.to(room).emit('notification.created', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      entity_type: notification.entity_type,
      entity_id: notification.entity_id,
      metadata: notification.metadata,
      created_at: notification.created_at,
    });
  } catch (err) {
    console.error('Failed to emit notification.created:', err);
  }
}

module.exports = { emitNotification };