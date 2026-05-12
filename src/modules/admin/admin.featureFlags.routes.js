// sajilo-backend/src/modules/admin/admin.featureFlags.routes.js
const express = require('express');
const router = express.Router();
const featureFlagsController = require('./admin.featureFlags.controller');
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');

// GET /api/admin/feature-flags
router.get(
  '/',
  authGuard,
  roleGuard('admin'),
  featureFlagsController.getFeatureFlags
);

// PUT /api/admin/feature-flags/:flagName
router.put(
  '/:flagName',
  authGuard,
  roleGuard('admin'),
  featureFlagsController.toggleFeatureFlag
);

module.exports = router;