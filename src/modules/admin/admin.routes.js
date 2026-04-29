const express = require('express')
const router = express.Router()
const adminController = require('./admin.controller')
const authGuard = require('../../middleware/auth.guard')
const roleGuard = require('../../middleware/role.guard')

router.get('/workers', authGuard, roleGuard('admin'), adminController.getWorkers)
router.put('/workers/:id/approve', authGuard, roleGuard('admin'), adminController.approveWorker)
router.put('/workers/:id/reject', authGuard, roleGuard('admin'), adminController.rejectWorker)
router.get('/stats', authGuard, roleGuard('admin'), adminController.getStats)

module.exports = router