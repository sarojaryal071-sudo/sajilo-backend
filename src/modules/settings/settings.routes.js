const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const authGuard = require('../../middleware/auth.guard');

// All routes require authentication
router.use(authGuard);

router.get('/', settingsController.getSettings);
router.patch('/', settingsController.updateSettings);

module.exports = router;