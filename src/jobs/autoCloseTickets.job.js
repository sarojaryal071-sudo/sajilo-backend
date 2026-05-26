const { pool } = require('../config/database');
const automationLog = require('../modules/automation/automationLog.service');
const { logAuditEvent } = require('../services/audit.service');

const STALE_DAYS = 7;

async function autoCloseTickets() {
  const startedAt = new Date();
  let status = 'success';
  let errorMessage = null;
  let closedCount = 0;

  // ── Audit job started ──
  try {
    const { logAuditEvent } = require('../services/audit.service');
    await logAuditEvent({
      req: null,
      action: 'cron.auto_close_tickets.started',
      entityType: 'system',
      summary: 'Auto-close tickets job started',
      severity: 'low',
      category: 'system',
      outcome: 'success',
      metadata: { staleDays: STALE_DAYS },
    });
  } catch (auditErr) { console.error('[autoCloseTickets] Audit started failed:', auditErr); }

  try {
    const result = await pool.query(
      `UPDATE support_tickets
       SET status = 'closed', updated_at = NOW()
       WHERE status = 'resolved'
         AND updated_at < NOW() - INTERVAL '1 day' * $1
       RETURNING id`,
      [STALE_DAYS]
    );
    closedCount = result.rowCount;
    console.log(`[autoCloseTickets] Closed ${closedCount} stale resolved ticket(s)`);

    try {
      await logAuditEvent({
        req: null,
        action: 'cron.auto_close_tickets',
        entityType: 'system',
        entityId: null,
        summary: `Auto-closed ${closedCount} stale resolved tickets`,
        severity: 'low',
        category: 'system',
        outcome: 'success',
        metadata: { closedCount, staleDays: STALE_DAYS },
      });
    } catch (auditErr) { console.error('Audit write failed (auto close):', auditErr); }
  } catch (err) {
    status = 'failure';
    errorMessage = err.message;
    console.error('[autoCloseTickets] Error:', err.message);
    try {
      await logAuditEvent({
        req: null,
        action: 'cron.auto_close_tickets.failed',
        entityType: 'system',
        summary: `Auto-close tickets job failed`,
        severity: 'medium',
        category: 'system',
        outcome: 'failure',
        reason: errorMessage,
      });
    } catch (auditErr) { console.error('Audit write failed (auto close failure):', auditErr); }
  }

  try {
    await automationLog.logExecution({
      automationKey: 'auto_close_stale_tickets',
      status,
      entityType: 'ticket',
      entityId: null,
      errorMessage,
      metadata: { closedCount, staleDays: STALE_DAYS },
      finishedAt: new Date(),
    });
  } catch (logErr) {
    console.error('[autoCloseTickets] Failed to log execution:', logErr.message);
  }
}

const { runWithCorrelationId } = require('../services/audit.service');
const { randomUUID } = require('crypto');

module.exports = function() {
  const correlationId = randomUUID();
  return runWithCorrelationId(correlationId, async () => {
    await autoCloseTickets();
  });
};