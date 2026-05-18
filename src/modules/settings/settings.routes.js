const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const authGuard = require('../../middleware/auth.guard');

router.use(authGuard);

router.get('/', settingsController.getSettings);
router.patch('/', settingsController.updateSettings);
router.get('/audit', settingsController.getAuditLogs);

module.exports = router;