// sajilo-backend/src/modules/admin/admin.featureFlags.routes.js
const express = require('express');
const router = express.Router();
const featureFlagsController = require('./admin.featureFlags.controller');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');

// GET /api/admin/feature-flags
router.get(
  '/',
  authGuard,
  permissionGuard('manage_feature_flags'),
  featureFlagsController.getFeatureFlags
);

// PUT /api/admin/feature-flags/:flagName
router.put(
  '/:flagName',
  authGuard,
  permissionGuard('manage_feature_flags'),
  featureFlagsController.toggleFeatureFlag
);

module.exports = router;