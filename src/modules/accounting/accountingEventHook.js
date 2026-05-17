// sajilo-backend/src/modules/accounting/accountingEventHook.js
const ACCOUNTING_EVENTS = require('./accountingEventTypes');

/**
 * Phase 2: disabled pipeline – logs events only.
 * Later phases will insert accounting_entries using this hook.
 */
function onEvent(eventType, payload) {
  console.log(`[ACCOUNTING EVENT] ${eventType}`, JSON.stringify(payload));
}

module.exports = { onEvent };