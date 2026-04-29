const express = require('express')
const router = express.Router()
const authController = require('./auth.controller')
const authGuard = require('../../middleware/auth.guard')

router.post('/register', authController.register)
router.post('/login', authController.login)
router.get('/me', authGuard, authController.me)

module.exports = router