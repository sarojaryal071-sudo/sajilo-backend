// sajilo-backend/src/modules/notifications/notifications.controller.js
const notificationsService = require('./notification.service');
const dispatchService = require('./notificationDispatcher.service');


/**
 * GET /api/notifications
 * Fetch all notifications for the authenticated user (limited to 100).
 */
async function getAll(req, res) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const notifications = await notificationsService.getAll(userId, userRole);
    return res.json({ notifications });
  } catch (err) {
    console.error('getAll notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/**
 * GET /api/notifications/unread
 * Fetch unread notifications for the authenticated user.
 */
async function getUnread(req, res) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const notifications = await notificationsService.getUnread(userId, userRole);
    return res.json({ notifications });
  } catch (err) {
    console.error('getUnread notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch unread notifications' });
  }
}

/**
 * GET /api/notifications/count
 * Get the unread count for the authenticated user.
 */
async function getUnreadCount(req, res) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const count = await notificationsService.getUnreadCount(userId, userRole);
    return res.json({ count });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return res.status(500).json({ error: 'Failed to fetch unread count' });
  }
}

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read.
 */
async function markRead(req, res) {
  try {
    const { id } = req.params;
    const updated = await notificationsService.markRead(Number(id));
    if (!updated) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    return res.json({ notification: updated });
  } catch (err) {
    console.error('markRead error:', err);
    return res.status(500).json({ error: 'Failed to mark as read' });
  }
}

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
async function markAllRead(req, res) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    await notificationsService.markAllRead(userId, userRole);
    return res.json({ success: true });
  } catch (err) {
    console.error('markAllRead error:', err);
    return res.status(500).json({ error: 'Failed to mark all as read' });
  }
}

async function dispatch(req, res) {
  try {
    const { title, message, type, target } = req.body;
    const created_by = req.user?.id || null;

    const result = await dispatchService.dispatchNotification({
      title,
      message,
      type,
      target,
      created_by,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[Notification Dispatch] Error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = {
  getAll,
  getUnread,
  getUnreadCount,
  markRead,
  markAllRead,
  dispatch,
};