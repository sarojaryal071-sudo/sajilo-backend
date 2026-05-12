const express = require('express');
const router = express.Router();
const moderationController = require('./moderation.controller');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');

router.put('/suspend', authGuard, permissionGuard('manage_workers'), moderationController.suspendUser);
router.put('/unsuspend', authGuard, permissionGuard('manage_workers'), moderationController.unsuspendUser);

module.exports = router;