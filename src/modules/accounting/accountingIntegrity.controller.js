// sajilo-backend/src/modules/accounting/accountingIntegrity.controller.js
const { pool } = require('../../config/database');

async function sourceReport(req, res) {
  try {
    const { rows: totals } = await pool.query(
      `SELECT
         COUNT(*)::int AS total_entries,
         COUNT(*) FILTER (WHERE ledger_entry_id IS NULL AND expense_id IS NULL AND journal_id IS NULL)::int AS orphan_entries,
         COUNT(*) FILTER (WHERE entry_type = 'AUTO')::int AS auto_entries,
         COUNT(*) FILTER (WHERE entry_type = 'MANUAL')::int AS manual_entries,
         COUNT(*) FILTER (WHERE entry_type = 'AUTO_BACKFILL')::int AS backfill_entries,
         COUNT(*) FILTER (WHERE entry_type = 'AUTO_EXPENSE')::int AS expense_entries
       FROM accounting_entries`
    );
    const { rows: recentOrphans } = await pool.query(
      `SELECT id, entry_type, debit_account, credit_account, amount, created_at
       FROM accounting_entries
       WHERE ledger_entry_id IS NULL AND expense_id IS NULL AND journal_id IS NULL
       ORDER BY created_at DESC
       LIMIT 20`
    );
    res.json({
      success: true,
      data: {
        ...totals[0],
        recentOrphans,
      },
    });
  } catch (err) {
    console.error('[INTEGRITY] Error fetching source report:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { sourceReport };