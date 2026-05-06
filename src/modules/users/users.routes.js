const express = require('express')
const router = express.Router()
const usersController = require('./users.controller')
const authGuard = require('../../middleware/auth.guard')
const roleGuard = require('../../middleware/role.guard')

router.get('/worker/earnings', authGuard, roleGuard('worker'), usersController.getWorkerEarnings)
router.get('/worker/me', authGuard, roleGuard('worker'), usersController.getWorkerMe)
router.put('/worker/me', authGuard, roleGuard('worker'), usersController.updateWorkerMe)
router.get('/me', authGuard, usersController.getMe)
router.put('/me', authGuard, usersController.updateMe)
router.get('/worker/schedule', authGuard, roleGuard('worker'), usersController.getSchedule)
router.put('/worker/schedule', authGuard, roleGuard('worker'), usersController.saveSchedule)
router.get('/worker/application', authGuard, usersController.getMyApplication)

module.exports = router