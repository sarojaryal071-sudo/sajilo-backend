const router = require('express').Router()
const reviewsController = require('./reviews.controller')
const authGuard = require('../../middleware/auth.guard')
const roleGuard = require('../../middleware/role.guard')

// Submit a review (customer only)
router.post('/', authGuard, roleGuard('customer'), reviewsController.createReview)

// Get reviews for a worker (public for now)
router.get('/worker/:workerId', reviewsController.getWorkerReviews)

module.exports = router