// sajilo-backend/src/modules/accounting/manualJournal.controller.js
const manualJournalService = require('./manualJournalService');

/**
 * POST /admin/accounting/journal
 * Body: { debit_account, credit_account, amount, currency?, remarks?, reference_type?, reference_id? }
 */
async function createManualEntry(req, res, next) {
  try {
    const { debit_account, credit_account, amount, currency, remarks, reference_type, reference_id } = req.body;
    // created_by is the admin user from auth middleware (assume req.user.id)
    const created_by = req.user?.id || null;

    const entry = await manualJournalService.createManualJournalEntry({
      debit_account,
      credit_account,
      amount,
      currency,
      remarks,
      reference_type,
      reference_id,
      created_by,
    });

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    // Validation errors → 400, others → 500
    const status = err.message.includes('required') || err.message.includes('must be') ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
}

/**
 * GET /admin/accounting/journal
 * Query: ?limit=50 (optional)
 */
async function listManualEntries(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const entries = await manualJournalService.listManualEntries(limit);
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /admin/accounting/journal/:id
 */
async function getManualEntryById(req, res, next) {
  try {
    const entry = await manualJournalService.getManualEntryById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Manual entry not found' });
    }
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createManualEntry,
  listManualEntries,
  getManualEntryById,
};