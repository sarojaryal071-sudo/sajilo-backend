const express = require('express');
const router = express.Router();
const controller = require('./verificationReview.controller');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');

// Worker: Get own review status
router.get('/me', authGuard, controller.getMyReviewStatus);

// Admin: Create a review decision
router.post('/document', authGuard, permissionGuard('view_analytics'), controller.createReview);

// Admin: Get worker's reviews
router.get('/worker/:workerId', authGuard, permissionGuard('view_analytics'), controller.getWorkerReviews);

// Admin: Get pending documents queue
router.get('/pending', authGuard, permissionGuard('view_analytics'), controller.getPendingDocuments);

module.exports = router;