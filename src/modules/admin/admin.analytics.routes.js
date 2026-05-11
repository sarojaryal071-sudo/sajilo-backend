const express = require('express');
const router = express.Router();
const analyticsController = require('./admin.analytics.controller');
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');

// Single endpoint: get all analytics
router.get(
  '/',
  authGuard,
  roleGuard('admin'),
  analyticsController.getAllAnalytics
);

module.exports = router;