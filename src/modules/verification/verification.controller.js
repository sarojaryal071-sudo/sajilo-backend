const verificationService = require('./verification.service');
const { logAuditEvent } = require('../../services/audit.service');

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

    try {
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: 'verification.submitted',
        entityType: 'verification',
        entityId: verification.worker_id,
        entityDisplay: `Worker #${verification.worker_id}`,
        summary: `Verification submitted by worker`,
        severity: 'medium',
        category: 'verification',
        outcome: 'success',
        newValues: { status: verification.status },
        contextSnapshot: { document_types: documents.map(d => d.document_type) },
      });
    } catch (auditErr) { console.error('Audit write failed (verification submit):', auditErr); }

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

    try {
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: 'verification.approved',
        entityType: 'verification',
        entityId: req.params.workerId,
        entityDisplay: `Worker #${req.params.workerId}`,
        summary: `Verification approved for worker #${req.params.workerId}`,
        severity: 'medium',
        category: 'verification',
        outcome: 'success',
        oldValues: { status: 'submitted' },
        newValues: { status: 'approved' },
      });
    } catch (auditErr) { console.error('Audit write failed (verification approved):', auditErr); }

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

    try {
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: 'verification.rejected',
        entityType: 'verification',
        entityId: req.params.workerId,
        entityDisplay: `Worker #${req.params.workerId}`,
        summary: `Verification rejected for worker #${req.params.workerId} (${reason})`,
        severity: 'medium',
        category: 'verification',
        outcome: 'success',
        oldValues: { status: 'submitted' },
        newValues: { status: 'rejected', reason },
        reason: note || null,
      });
    } catch (auditErr) { console.error('Audit write failed (verification rejected):', auditErr); }

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