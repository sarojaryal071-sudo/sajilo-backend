const express = require('express');
const router = express.Router();
const analyticsController = require('./admin.analytics.controller');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');

// Single endpoint: get all analytics
router.get(
  '/',
  authGuard,
  permissionGuard('view_analytics'),
  analyticsController.getAllAnalytics
);

module.exports = router;