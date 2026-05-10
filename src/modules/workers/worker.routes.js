/*
 * Worker Routes — API endpoints for worker operations
 */
const router = require('express').Router()
const workerController = require('./worker.controller')
const authGuard = require('../../middleware/auth.guard')
const roleGuard = require('../../middleware/role.guard')            // ← added

const cancellationController = require('../bookings/cancellation.controller')

router.get('/categories', workerController.getCategories)
router.get('/search', workerController.searchWorkers)

// Cancellation endpoints (must be before /:id)
router.get('/cancellations/unacknowledged', authGuard, roleGuard('worker'), cancellationController.getUnacknowledged)
router.put('/cancellations/:id/acknowledge', authGuard, roleGuard('worker'), cancellationController.acknowledge)

// Protected: get worker detail (keep this at the end so it doesn't shadow other routes)
router.get('/:id', authGuard, workerController.getWorker)

module.exports = router