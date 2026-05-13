/**
 * Verification Routes
 * Phase 17 — Worker Verification & Professional Onboarding System
 */
const express = require('express');
const router = express.Router();
const controller = require('./verification.controller');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');

// Worker: Get own verification status
router.get('/me', authGuard, controller.getMyVerification);

// Worker: Submit verification documents
router.post('/submit', authGuard, controller.submitVerification);

// Public: Check if a worker is verified
router.get('/check/:workerId', authGuard, controller.checkVerificationStatus);

// Admin: Get pending verification queue
router.get('/admin/queue', authGuard, permissionGuard('view_analytics'), controller.getPendingQueue);

// Admin: Approve a worker's verification
router.put('/admin/:workerId/approve', authGuard, permissionGuard('view_analytics'), controller.approveVerification);

// Admin: Reject a worker's verification
router.put('/admin/:workerId/reject', authGuard, permissionGuard('view_analytics'), controller.rejectVerification);

module.exports = router;