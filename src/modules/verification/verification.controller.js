/**
 * Verification Controller
 * Phase 17 — Request handlers for verification routes
 */
const verificationService = require('./verification.service');

async function getMyVerification(req, res, next) {
  try {
    const verification = await verificationService.getVerification(req.user.id);
    res.json({ success: true, data: verification });
  } catch (err) {
    next(err);
  }
}

async function submitVerification(req, res, next) {
  try {
    const { documents } = req.body;
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ success: false, message: 'Documents array is required' });
    }
    const verification = await verificationService.submitVerification(req.user.id, documents);
    res.json({ success: true, data: verification, message: 'Verification submitted for review' });
  } catch (err) {
    next(err);
  }
}

async function getPendingQueue(req, res, next) {
  try {
    const queue = await verificationService.getPendingVerifications();
    res.json({ success: true, data: queue });
  } catch (err) {
    next(err);
  }
}

async function approveVerification(req, res, next) {
  try {
    const verification = await verificationService.approveVerification(req.params.workerId, req.user.id);
    res.json({ success: true, data: verification, message: 'Verification approved' });
  } catch (err) {
    next(err);
  }
}

async function rejectVerification(req, res, next) {
  try {
    const { reason, note } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }
    const verification = await verificationService.rejectVerification(req.params.workerId, req.user.id, reason, note || null);
    res.json({ success: true, data: verification, message: 'Verification rejected' });
  } catch (err) {
    next(err);
  }
}

async function checkVerificationStatus(req, res, next) {
  try {
    const verified = await verificationService.isVerified(req.params.workerId);
    res.json({ success: true, data: { verified } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyVerification,
  submitVerification,
  getPendingQueue,
  approveVerification,
  rejectVerification,
  checkVerificationStatus,
};