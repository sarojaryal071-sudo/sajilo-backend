// sajilo-backend/src/modules/admin/policy.routes.js
const express = require('express');
const router = express.Router();
const policyController = require('./policy.controller');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');

// All policy routes require authentication and the 'manage_policies' permission
router.get('/',   authGuard, permissionGuard('manage_policies'), policyController.getAll);
router.put('/:key', authGuard, permissionGuard('manage_policies'), policyController.update);

module.exports = router;