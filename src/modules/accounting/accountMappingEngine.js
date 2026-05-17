// sajilo-backend/src/modules/accounting/accountMappingEngine.js

/**
 * @param {string} eventType    - e.g. 'BOOKING_PAYMENT', 'WORKER_PAYOUT'
 * @param {object} payload      - event payload (must contain amount, reference_id, etc.)
 * @param {object} rule         - mapping rule from account_mapping_rules table
 * @param {string} rule.debit_account
 * @param {string} rule.credit_account
 * @param {object} [rule.condition] - optional condition to validate (not enforced yet)
 * @returns {object} { debit_account, credit_account, amount, reference_type, reference_id, remarks }
 */
function mapEventToAccounting(eventType, payload, rule) {
  // Simple condition check if present (for future use)
  if (rule.condition) {
    // For now, just log that condition exists; we can implement predicate later
    console.log(`[accounting engine] condition present for ${eventType}`, rule.condition);
  }

  return {
    debit_account: rule.debit_account,
    credit_account: rule.credit_account,
    amount: payload.amount,
    reference_type: eventType,
    reference_id: payload.reference_id || payload.bookingId || payload.paymentId || null,
    remarks: payload.remarks || `Auto-generated entry for ${eventType}`,
  };
}

module.exports = { mapEventToAccounting };