/*
 * Worker Routes — API endpoints for worker operations
 * Activated later via: app.use('/api/workers', workerRoutes)
 */
const router = require('express').Router()
const workerController = require('./worker.controller')
const authGuard = require('../../middleware/auth.guard')

// Public: search workers (future auth optional)
router.get('/search', workerController.searchWorkers)

// Protected: get worker detail
router.get('/:id', authGuard, workerController.getWorker)

module.exports = router