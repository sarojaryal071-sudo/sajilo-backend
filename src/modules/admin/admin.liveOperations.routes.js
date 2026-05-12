// sajilo-backend/src/modules/admin/admin.liveOperations.routes.js
const express = require('express');
const router = express.Router();
const liveOpsController = require('./admin.liveOperations.controller');
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');

router.get(
  '/',
  authGuard,
  roleGuard('admin'),
  liveOpsController.getLiveOperations
);

module.exports = router;