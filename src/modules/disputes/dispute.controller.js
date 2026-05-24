const disputeService = require('./dispute.service');

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
    const dispute = await disputeService.updateDisputeStatus(Number(req.params.id), status);
    res.json({ success: true, data: dispute });
  } catch (err) {
    next(err);
  }
}

module.exports = { escalate, getAll, getById, updateStatus };