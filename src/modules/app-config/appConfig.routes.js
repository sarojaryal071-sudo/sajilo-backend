// sajilo-backend/src/modules/app-config/appConfig.routes.js
const express = require('express');
const router = express.Router();
const controller = require('./appConfig.controller');

// Public endpoint – no auth required
router.get('/', controller.getAppConfig);

module.exports = router;