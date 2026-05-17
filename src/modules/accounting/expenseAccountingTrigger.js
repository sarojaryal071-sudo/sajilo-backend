// sajilo-backend/src/modules/accounting/expenseAccountingTrigger.js
const { createAccountingEntry } = require('./accountingEntryService');
const { mapExpenseToAccounting } = require('./expenseAccountingMapper');
const { generateHash, isProcessed, markProcessed } = require('./accountingIdempotencyService');

async function onExpenseStatusChanged(expense) {
  try {
    // Only act on approved or paid expenses
    if (expense.status !== 'approved' && expense.status !== 'paid') return;

    const sourceId = expense.id;
    const sourceType = 'expense';
    const eventType = 'EXPENSE';

    const hash = generateHash({
      source_type: sourceType,
      source_id: sourceId,
      event_type: eventType,
      amount: parseFloat(expense.amount),
    });

    // Idempotency check
    if (await isProcessed(hash)) {
      console.log(`[EXPENSE ACCOUNTING] Skipping duplicate expense ${sourceId}`);
      return;
    }

    // Map and insert
    const accountingPayload = await mapExpenseToAccounting(expense);

    await createAccountingEntry({
      ledger_entry_id: null,           // no direct ledger link
      expense_id: expense.id,
      journal_id: null,                // could be set if using journals
      debit_account: accountingPayload.debit_account,
      credit_account: accountingPayload.credit_account,
      amount: accountingPayload.amount,
      currency: expense.currency || 'NPR',
      reference_type: accountingPayload.reference_type,
      reference_id: accountingPayload.reference_id,
      remarks: accountingPayload.remarks,
      entry_type: 'AUTO_EXPENSE',
      created_by: expense.approved_by || expense.created_by,
    });

    // Mark processed
    await markProcessed({
      source_type: sourceType,
      source_id: sourceId,
      event_type: eventType,
      hash,
    });

    console.log(`[EXPENSE ACCOUNTING] Entry created for expense ${sourceId}`);
  } catch (err) {
    console.error(`[EXPENSE ACCOUNTING ERROR] Expense ${expense.id}`, err);
  }
}

module.exports = { onExpenseStatusChanged };