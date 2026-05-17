// sajilo-backend/src/modules/accounting/ledgerEventListener.js
const { getRuleByEvent } = require('./accountMappingService');
const { mapEventToAccounting } = require('./accountMappingEngine');
const { createAccountingEntry } = require('./accountingEntryService');
const ACCOUNTING_EVENTS = require('./accountingEventTypes');
const { generateHash, isProcessed, markProcessed } = require('./accountingIdempotencyService');


/**
 * Map ledger event_type → accounting event type.
 * Any unmapped event defaults to ADJUSTMENT.
 */
const LEDGER_EVENT_MAP = {
  invoice_finalized: ACCOUNTING_EVENTS.BOOKING_PAYMENT,
  payment_confirmed: ACCOUNTING_EVENTS.BOOKING_PAYMENT,
  commission_settled: ACCOUNTING_EVENTS.WORKER_PAYOUT,
};

async function onLedgerEntryCreated(ledgerEntry) {
  try {
    const hash = generateHash({
      source_type: 'ledger',
      source_id: ledgerEntry.id,
      event_type: ledgerEntry.event_type,
      amount: parseFloat(ledgerEntry.amount),
    });

    if (await isProcessed(hash)) {
      console.log(`[ACCOUNTING] Skipping duplicate ledger event ${ledgerEntry.id}`);
      return;
    }

    const accountingEventType = LEDGER_EVENT_MAP[ledgerEntry.event_type] || ACCOUNTING_EVENTS.ADJUSTMENT;

    const rule = await getRuleByEvent(accountingEventType);
    if (!rule) {
      console.log(`[ACCOUNTING] No rule for event ${accountingEventType}, skipping entry`);
      return;
    }

    const payload = {
      amount: parseFloat(ledgerEntry.amount),
      reference_id: ledgerEntry.booking_id || ledgerEntry.payment_id || ledgerEntry.id,
      remarks: `From ledger entry ${ledgerEntry.id}`,
    };

    const struct = mapEventToAccounting(accountingEventType, payload, rule);

    const entry = {
      ledger_entry_id: ledgerEntry.id,
      debit_account: struct.debit_account,
      credit_account: struct.credit_account,
      amount: struct.amount,
      currency: ledgerEntry.currency || 'NPR',
      reference_type: struct.reference_type,
      reference_id: struct.reference_id,
      remarks: struct.remarks,
      entry_type: 'AUTO',
      created_by: ledgerEntry.created_by_user || null,
    };

    await createAccountingEntry(entry);
    await markProcessed({ source_type: 'ledger', source_id: ledgerEntry.id, event_type: ledgerEntry.event_type, hash });
    console.log(`[ACCOUNTING] Entry created for ledger ${ledgerEntry.id} (${accountingEventType})`);
  } catch (err) {
    console.error(`[ACCOUNTING ERROR] onLedgerEntryCreated for ledger ${ledgerEntry.id}`, err);
  }
}

module.exports = { onLedgerEntryCreated };