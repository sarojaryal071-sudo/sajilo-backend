// sajilo-backend/src/modules/admin/admin.staff.routes.js
const express = require('express');
const router = express.Router();
const staffController = require('./admin.staff.controller');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');

// All staff routes require authentication and the 'manage_staff' permission
router.post('/',           authGuard, permissionGuard('manage_staff'), staffController.createStaff);
router.get('/',            authGuard, permissionGuard('manage_staff'), staffController.listStaff);
router.put('/:id/toggle',  authGuard, permissionGuard('manage_staff'), staffController.toggleStaff);

module.exports = router;