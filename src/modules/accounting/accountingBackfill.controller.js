// sajilo-backend/src/modules/accounting/accountingBackfill.controller.js
const { backfillLedgerToAccounting } = require('./accountingBackfillService');
const { pool } = require('../../config/database');

async function runBackfill(req, res) {
  try {
    const summary = await backfillLedgerToAccounting();
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('[BACKFILL] Run failed:', err);
    res.status(500).json({ success: false, message: 'Backfill failed' });
  }
}

async function getBackfillStatus(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS missing_count
       FROM financial_ledger fl
       WHERE fl.event_type IN ('invoice_finalized', 'payment_confirmed', 'commission_settled')
         AND fl.id NOT IN (SELECT ledger_entry_id FROM accounting_entries WHERE ledger_entry_id IS NOT NULL)`
    );
    const missingCount = parseInt(rows[0].missing_count);
    res.json({ success: true, data: { missing_ledger_entries: missingCount } });
  } catch (err) {
    console.error('[BACKFILL STATUS ERROR]', err);
    res.status(500).json({ success: false, message: 'Failed to get backfill status' });
  }
}

module.exports = { runBackfill, getBackfillStatus };