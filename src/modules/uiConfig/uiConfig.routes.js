const express = require('express');
const router = express.Router();
const controller = require('./uiConfig.controller');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');

// Backward‑compatible default route – used by the current frontend runtime
router.get('/', authGuard, async (req, res) => {
  // Use the published config for the default "global" scope
  req.params.scope = 'global';
  return controller.getPublished(req, res);
});

// Public: Get published config for any scope
router.get('/:scope/published', controller.getPublished);

// Public: Get published tokens as flat key-value
router.get('/:scope/tokens', controller.getPublishedTokens);

// Admin: Get draft config
router.get('/:scope/draft', authGuard, permissionGuard('view_analytics'), controller.getDraft);

// Admin: Update draft config
router.post('/:scope/draft', authGuard, permissionGuard('view_analytics'), controller.updateDraft);

// Admin: Publish draft
router.post('/:scope/publish', authGuard, permissionGuard('view_analytics'), controller.publishConfig);

// Admin: Reset draft
router.post('/:scope/reset', authGuard, permissionGuard('view_analytics'), controller.resetDraft);

module.exports = router;