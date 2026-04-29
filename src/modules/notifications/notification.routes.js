const express = require('express')
const router = express.Router()
const notificationController = require('./notification.controller')
const authGuard = require('../../middleware/auth.guard')
const roleGuard = require('../../middleware/role.guard')

router.post('/', authGuard, roleGuard('admin'), notificationController.send)
router.get('/', authGuard, roleGuard('admin'), notificationController.list)

module.exports = router