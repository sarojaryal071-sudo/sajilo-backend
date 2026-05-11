const router = require('express').Router()
const workerController = require('./worker.controller')
const authGuard = require('../../middleware/auth.guard')
const roleGuard = require('../../middleware/role.guard')
const cancellationController = require('../bookings/cancellation.controller')
const workerServicesController = require('./workerServices.controller')

router.get('/categories', workerController.getCategories)
router.get('/search', workerController.searchWorkers)

// Cancellation endpoints (must be before /:id)
router.get('/cancellations/unacknowledged', authGuard, roleGuard('worker'), cancellationController.getUnacknowledged)
router.put('/cancellations/:id/acknowledge', authGuard, roleGuard('worker'), cancellationController.acknowledge)

// Worker services (must be before /:id)
router.get('/me/services', authGuard, roleGuard('worker'), workerServicesController.getMyServices)
router.put('/me/services/:id', authGuard, roleGuard('worker'), workerServicesController.updateService)
router.post('/me/services/custom', authGuard, roleGuard('worker'), workerServicesController.createCustom)
router.post('/me/services/activate', authGuard, roleGuard('worker'), workerServicesController.activateService)
router.delete('/me/services/:id', authGuard, roleGuard('worker'), workerServicesController.deleteService)
router.get('/:workerId/services', workerServicesController.getPublicServices)

// Protected: get worker detail (must be last to avoid shadowing other routes)
router.get('/:id', authGuard, workerController.getWorker)

module.exports = router