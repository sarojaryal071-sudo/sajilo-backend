// sajilo-backend/src/jobs/autoCloseTickets.job.js
const { pool } = require('../config/database');
const automationLog = require('../modules/automation/automationLog.service');

const STALE_DAYS = 7;   // close tickets that have been resolved for 7 days with no updates

/**
 * Close support tickets that are in 'resolved' status
 * and haven't been updated for more than STALE_DAYS.
 */
async function autoCloseTickets() {
  const startedAt = new Date();
  let status = 'success';
  let errorMessage = null;
  let closedCount = 0;

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
  } catch (err) {
    status = 'failure';
    errorMessage = err.message;
    console.error('[autoCloseTickets] Error:', err.message);
  }

  // Log the execution
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

module.exports = autoCloseTickets;