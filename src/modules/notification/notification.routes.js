const express = require('express');
const router = express.Router();
const notificationsController = require('./notification.controller');
const dispatchController = require('./notificationDispatch.controller');
const authGuard = require('../../middleware/auth.guard');

// All routes require authentication
router.use(authGuard);

// Admin: dispatch a notification to multiple users
router.post('/dispatch', dispatchController.dispatch);

// Get all notifications for the logged-in user
router.get('/', notificationsController.getAll);

// Get unread notifications
router.get('/unread', notificationsController.getUnread);

// Get unread count (badge)
router.get('/count', notificationsController.getUnreadCount);

// Mark a single notification as read
router.put('/:id/read', notificationsController.markRead);

// Mark all notifications as read
router.put('/read-all', notificationsController.markAllRead);

module.exports = router;