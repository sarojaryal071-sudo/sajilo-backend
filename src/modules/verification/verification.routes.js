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

// Worker: Upload a single verification document
const upload = require('../../middleware/upload.middleware');
const storageService = require('../../services/storage.service');

router.post('/upload-document', authGuard, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });
    const { document_type } = req.body;
    if (!document_type) return res.status(400).json({ success: false, error: 'Document type required' });

    const result = await storageService.uploadFile(req.file, 'sajilo/documents/applications');
    res.json({ success: true, data: { url: result.url, publicId: result.publicId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;