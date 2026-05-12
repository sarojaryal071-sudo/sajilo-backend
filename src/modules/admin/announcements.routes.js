// sajilo-backend/src/modules/admin/announcements.routes.js
const express = require('express');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');
const announcementsController = require('./announcements.controller');

// Admin router – CRUD (only for users with manage_announcements permission)
const adminRouter = express.Router();
adminRouter.post('/',   authGuard, permissionGuard('manage_announcements'), announcementsController.create);
adminRouter.get('/',    authGuard, permissionGuard('manage_announcements'), announcementsController.getAll);
adminRouter.put('/:id', authGuard, permissionGuard('manage_announcements'), announcementsController.update);
adminRouter.delete('/:id', authGuard, permissionGuard('manage_announcements'), announcementsController.remove);

// Public router – get active announcements for current user (any authenticated user can access)
const publicRouter = express.Router();
publicRouter.get('/', authGuard, announcementsController.getActiveForUser);

module.exports = { adminRouter, publicRouter };