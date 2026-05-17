// sajilo-backend/src/modules/accounting/accountingBackfillService.js
const { pool } = require('../../config/database');
const { createAccountingEntry } = require('./accountingEntryService');
const { mapEventToAccounting } = require('./accountMappingEngine');
const { getRuleByEvent } = require('./accountMappingService');
const ACCOUNTING_EVENTS = require('./accountingEventTypes');

// Same mapping as ledgerEventListener (duplicated for independence)
const LEDGER_EVENT_MAP = {
  invoice_finalized: ACCOUNTING_EVENTS.BOOKING_PAYMENT,
  payment_confirmed: ACCOUNTING_EVENTS.BOOKING_PAYMENT,
  commission_settled: ACCOUNTING_EVENTS.WORKER_PAYOUT,
};

async function backfillLedgerToAccounting() {
  const summary = { processed: 0, skipped: 0, failed: 0, errors: [] };

  // Find ledger entries that have no accounting entry yet
  const { rows: missing } = await pool.query(
    `SELECT fl.* FROM financial_ledger fl
     WHERE fl.event_type IN ('invoice_finalized', 'payment_confirmed', 'commission_settled')
       AND fl.id NOT IN (SELECT ledger_entry_id FROM accounting_entries WHERE ledger_entry_id IS NOT NULL)
     ORDER BY fl.created_at ASC`
  );

  for (const le of missing) {
    try {
      const accountingEventType = LEDGER_EVENT_MAP[le.event_type] || ACCOUNTING_EVENTS.ADJUSTMENT;
      const rule = await getRuleByEvent(accountingEventType);
      if (!rule) {
        summary.skipped++;
        continue;
      }

      const payload = {
        amount: parseFloat(le.amount),
        reference_id: le.booking_id || le.payment_id || le.id,
        remarks: `Backfill from ledger entry ${le.id} (${le.event_type})`,
      };

      const struct = mapEventToAccounting(accountingEventType, payload, rule);

      const entry = {
        ledger_entry_id: le.id,
        debit_account: struct.debit_account,
        credit_account: struct.credit_account,
        amount: struct.amount,
        currency: le.currency || 'NPR',
        reference_type: struct.reference_type,
        reference_id: struct.reference_id,
        remarks: struct.remarks,
        entry_type: 'AUTO_BACKFILL',
        created_by: null,   // system action
      };

      await createAccountingEntry(entry);
      summary.processed++;
    } catch (err) {
      console.error(`[BACKFILL ERROR] Ledger entry ${le.id}:`, err);
      summary.failed++;
      summary.errors.push({ ledger_id: le.id, error: err.message });
    }
  }

  console.log(`[BACKFILL] Processed ${summary.processed}, skipped ${summary.skipped}, failed ${summary.failed}`);
  return summary;
}

module.exports = { backfillLedgerToAccounting };