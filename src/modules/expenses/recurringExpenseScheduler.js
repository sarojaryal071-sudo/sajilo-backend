// sajilo-backend/src/modules/expenses/recurringExpenseScheduler.js
const { runRecurringEngine } = require('./recurringExpenseEngine');

async function triggerRecurringGeneration() {
  try {
    const results = await runRecurringEngine();
    const generated = results.filter(r => r.generated);
    console.log(`[RecurringEngine] Generated ${generated.length} expenses.`);
    return { success: true, generated: generated.length, details: results };
  } catch (err) {
    console.error('[RecurringEngine] Error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { triggerRecurringGeneration };