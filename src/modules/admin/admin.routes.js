const express = require('express')
const router = express.Router()
const adminController = require('./admin.controller')
const authGuard = require('../../middleware/auth.guard')
const roleGuard = require('../../middleware/role.guard')

router.get('/workers', authGuard, roleGuard('admin'), adminController.getWorkers)
router.put('/workers/:id/approve', authGuard, roleGuard('admin'), adminController.approveWorker)
router.put('/workers/:id/reject', authGuard, roleGuard('admin'), adminController.rejectWorker)
router.get('/stats', authGuard, roleGuard('admin'), adminController.getStats)
router.get('/customers', authGuard, roleGuard('admin'), adminController.getCustomers)

// Analytics
router.use('/analytics', authGuard, roleGuard('admin'), require('./admin.analytics.routes'))
router.use('/professions', authGuard, roleGuard('admin'), require('./admin.professions.routes'))
router.use('/professions', authGuard, roleGuard('admin'), require('./admin.professionServices.routes'))

// Feature Flags (Phase 12D)
router.use('/feature-flags', authGuard, roleGuard('admin'), require('./admin.featureFlags.routes'))
router.use('/live-operations', authGuard, roleGuard('admin'), require('./admin.liveOperations.routes'))
router.use('/moderation', authGuard, roleGuard('admin'), require('./moderation.routes'))

module.exports = router