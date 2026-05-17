// sajilo-backend/src/modules/accounting/accountingReconciliation.controller.js
const { compareLedgerVsAccounting } = require('./accountingReconciliationService');

async function getReconciliationReport(req, res) {
  try {
    const report = await compareLedgerVsAccounting();
    res.json({ success: true, data: report });
  } catch (err) {
    console.error('[RECONCILIATION ERROR]', err);
    res.status(500).json({ success: false, message: 'Failed to generate reconciliation report' });
  }
}

module.exports = { getReconciliationReport };