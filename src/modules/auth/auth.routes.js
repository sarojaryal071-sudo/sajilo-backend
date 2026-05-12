const express = require('express')
const router = express.Router()
const authController = require('./auth.controller')
const authGuard = require('../../middleware/auth.guard')
const { authLimiter } = require('../../middleware/rateLimiter')
const sanitizeRequest = require('../../middleware/sanitizer')

// Apply sanitizer to all auth routes, then rate limiter, then handler
router.post('/register', sanitizeRequest, authLimiter, authController.register)
router.post('/login', sanitizeRequest, authLimiter, authController.login)
router.post('/worker/apply', authGuard, sanitizeRequest, authController.submitWorkerApplication)

router.get('/me', authGuard, authController.me)

module.exports = router