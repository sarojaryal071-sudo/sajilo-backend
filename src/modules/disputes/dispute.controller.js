const disputeService = require('./dispute.service');
const { logAuditEvent } = require('../../services/audit.service');

async function escalate(req, res, next) {
  try {
    const { supportTicketId, workerId, bookingId, category, priority, supportNote, attachmentIds, extraFileUrls } = req.body;
    if (!supportTicketId || !category) return res.status(400).json({ success: false, error: 'supportTicketId and category are required' });

    const dispute = await disputeService.escalateToDispute(
      supportTicketId,
      req.user.id,
      req.user.name || 'Admin',
      { workerId, bookingId, category, priority, supportNote, attachmentIds: attachmentIds || [], extraFileUrls: extraFileUrls || [] }
    );

    // Audit dispute creation
    try {
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: 'dispute.opened',
        entityType: 'dispute',
        entityId: dispute.id,
        entityDisplay: dispute.dispute_token,
        summary: `Dispute ${dispute.dispute_token} opened from ticket #${supportTicketId}`,
        severity: 'high',
        category: 'dispute',
        outcome: 'success',
        contextSnapshot: {
          dispute_token: dispute.dispute_token,
          support_ticket_id: supportTicketId,
          category,
          priority,
        },
        metadata: {
          workerId: workerId || null,
          bookingId: bookingId || null,
        },
      });
    } catch (auditErr) {
      console.error('AUDIT FAILED (dispute escalate):', auditErr);
    }

    res.json({ success: true, data: dispute });
  } catch (err) {
    next(err);
  }
}

async function getAll(req, res, next) {
  try {
    const disputes = await disputeService.getAllDisputes();
    res.json({ success: true, data: disputes });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const dispute = await disputeService.getDisputeById(Number(req.params.id));
    if (!dispute) return res.status(404).json({ success: false, error: 'Dispute not found' });
    res.json({ success: true, data: dispute });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status required' });

    // Fetch old status for audit
    const oldDispute = await disputeService.getDisputeById(Number(req.params.id));
    const oldStatus = oldDispute?.status || 'unknown';

    const dispute = await disputeService.updateDisputeStatus(Number(req.params.id), status);

    // Audit status change
    try {
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: 'dispute.status_changed',
        entityType: 'dispute',
        entityId: dispute.id,
        entityDisplay: dispute.dispute_token,
        summary: `Dispute ${dispute.dispute_token} status changed from ${oldStatus} to ${status}`,
        severity: status === 'resolved' ? 'medium' : 'low',
        category: 'dispute',
        outcome: 'success',
        oldValues: { status: oldStatus },
        newValues: { status },
        reason: req.body.reason || null,
      });
    } catch (auditErr) {
      console.error('AUDIT FAILED (dispute status):', auditErr);
    }

    res.json({ success: true, data: dispute });
  } catch (err) {
    next(err);
  }
}

module.exports = { escalate, getAll, getById, updateStatus };