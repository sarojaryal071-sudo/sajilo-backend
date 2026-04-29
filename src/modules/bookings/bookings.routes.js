const express = require('express')
const router = express.Router()
const bookingsController = require('./bookings.controller')
const authGuard = require('../../middleware/auth.guard')
const roleGuard = require('../../middleware/role.guard')

router.post('/', authGuard, roleGuard('customer'), bookingsController.create)
router.get('/worker/list', authGuard, roleGuard('worker'), bookingsController.getWorkerBookings)
router.get('/my', authGuard, bookingsController.getMyBookings)
router.get('/:id', authGuard, bookingsController.getById)
router.put('/:id/accept', authGuard, roleGuard('worker'), bookingsController.accept)
router.put('/:id/reject', authGuard, roleGuard('worker'), bookingsController.reject)
router.put('/:id/status', authGuard, roleGuard('worker'), bookingsController.updateStatus)

module.exports = router