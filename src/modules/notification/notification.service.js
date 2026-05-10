// sajilo-backend/src/modules/notifications/notifications.service.js
const notificationsModel = require('./notification.model');
const { emitNotification } = require('./notificationSocket');

/**
 * Create a notification for a specific user.
 * This is the single entry point that other services call.
 * Automatically emits a socket event to the target user after creation.
 */
async function createNotification({ userId, userRole, type, title, message, entityType, entityId, metadata }) {
    const notification = await notificationsModel.create({
    user_id: userId,
    user_role: userRole,
    type,
    title,
    message: message || null,
    entity_type: entityType || null,
    entity_id: entityId || null,
    metadata: metadata || null,
  });

  // Emit real-time notification event to the user
  emitNotification(notification).catch(err => {
    console.error('Notification socket emit failed:', err);
  });

  return notification;
}

/**
 * Get unread notifications for a user (for the badge count + drawer).
 */
async function getUnread(userId, userRole, limit = 50) {
  return notificationsModel.getUnreadByUser(userId, userRole, limit);
}

/**
 * Get all notifications for a user (for the full notification screen).
 */
async function getAll(userId, userRole, limit = 100) {
  return notificationsModel.getByUser(userId, userRole, limit);
}

/**
 * Mark a single notification as read.
 */
async function markRead(notificationId) {
  return notificationsModel.markRead(notificationId);
}

/**
 * Mark all notifications for a user as read.
 */
async function markAllRead(userId, userRole) {
  return notificationsModel.markAllRead(userId, userRole);
}

/**
 * Get unread count for a user (for the badge number).
 */
async function getUnreadCount(userId, userRole) {
  return notificationsModel.getUnreadCount(userId, userRole);
}

module.exports = {
  createNotification,
  getUnread,
  getAll,
  markRead,
  markAllRead,
  getUnreadCount,
};