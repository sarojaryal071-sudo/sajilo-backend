// sajilo-backend/src/modules/expenses/recurringExpenseEngine.js
const { pool } = require('../../config/database');
const crypto = require('crypto');
const { createSystemGeneratedExpense } = require('./expenseService');

/**
 * Determine if a rule is due based on its last_generated_at.
 */
function isRuleDue(rule) {
  if (!rule.last_generated_at) return true; // never run
  const now = new Date();
  const last = new Date(rule.last_generated_at);
  const diffMs = now - last;
  const days = diffMs / (1000 * 60 * 60 * 24);
  switch (rule.recurrence_type) {
    case 'DAILY':   return days >= rule.interval_value;
    case 'WEEKLY':  return days >= rule.interval_value * 7;
    case 'MONTHLY': return days >= rule.interval_value * 30; // approx
    case 'YEARLY':  return days >= rule.interval_value * 365;
    default: return false;
  }
}

/**
 * Generate a unique hash for a rule + period to prevent duplicates.
 */
function generateHash(rule, periodStart, periodEnd) {
  const raw = `${rule.id}|${periodStart}|${periodEnd}|${rule.amount_value}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Process a single rule: if due, generate an expense and log it.
 */
async function processRule(rule) {
  if (!isRuleDue(rule)) return { generated: false };

  // Determine the current period start/end
  const now = new Date();
  let periodStart, periodEnd;
  switch (rule.recurrence_type) {
    case 'DAILY':
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0,10);
      periodEnd = periodStart;
      break;
    case 'WEEKLY':
      const dayOfWeek = now.getDay();
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).toISOString().slice(0,10);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 6).toISOString().slice(0,10);
      break;
    case 'MONTHLY':
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0,10);
      break;
    case 'YEARLY':
      periodStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0,10);
      periodEnd = new Date(now.getFullYear(), 11, 31).toISOString().slice(0,10);
      break;
  }

  const hash = generateHash(rule, periodStart, periodEnd);

  // Idempotency check
  const existing = await pool.query('SELECT id FROM recurring_expense_log WHERE hash = $1', [hash]);
  if (existing.rows.length > 0) return { generated: false };

  // Create system-generated expense
  const expense = await createSystemGeneratedExpense({
    title: `${rule.name} (Recurring)`,
    vendor_id: rule.vendor_id,
    category_id: rule.category_id,
    amount: parseFloat(rule.amount_value),
    expense_date: periodEnd,
    cost_center_code: rule.cost_center_code,
    expense_type: rule.expense_type,
  });

  if (expense) {
    // Log generation
    await pool.query(
      `INSERT INTO recurring_expense_log (rule_id, generated_expense_id, period_start, period_end, hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [rule.id, expense.id, periodStart, periodEnd, hash]
    );

    // Update rule's last_generated_at
    await pool.query(
      'UPDATE recurring_expense_rules SET last_generated_at = NOW() WHERE id = $1',
      [rule.id]
    );

    return { generated: true, expenseId: expense.id };
  }

  return { generated: false };
}

/**
 * Run the recurring engine over all active rules.
 */
async function runRecurringEngine() {
  const { rows: rules } = await pool.query(
    'SELECT * FROM recurring_expense_rules WHERE is_active = true'
  );
  const results = [];
  for (const rule of rules) {
    const res = await processRule(rule);
    results.push({ ruleId: rule.id, ...res });
  }
  return results;
}

module.exports = { runRecurringEngine, processRule };