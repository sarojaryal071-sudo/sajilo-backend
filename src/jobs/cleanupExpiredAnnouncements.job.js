// sajilo-backend/src/jobs/cleanupExpiredAnnouncements.job.js
const { pool } = require('../config/database');
const automationLog = require('../modules/automation/automationLog.service');

/**
 * Delete announcements that have an expires_at timestamp older than now.
 * Logs execution in automation_logs.
 */
async function cleanupExpiredAnnouncements() {
  const startedAt = new Date();
  let status = 'success';
  let errorMessage = null;
  let deletedCount = 0;

  try {
    const result = await pool.query(
      `DELETE FROM announcements
       WHERE expires_at IS NOT NULL
         AND expires_at < NOW()
       RETURNING id`
    );
    deletedCount = result.rowCount;
    console.log(`[cleanupExpiredAnnouncements] Deleted ${deletedCount} expired announcement(s)`);
  } catch (err) {
    status = 'failure';
    errorMessage = err.message;
    console.error(`[cleanupExpiredAnnouncements] Error:`, err.message);
  }

  // Always log the execution
  try {
    await automationLog.logExecution({
      automationKey: 'cleanup_expired_announcements',
      status,
      entityType: 'announcement',
      entityId: null,
      errorMessage,
      metadata: { deletedCount },
      finishedAt: new Date(),
    });
  } catch (logErr) {
    console.error('[cleanupExpiredAnnouncements] Failed to log execution:', logErr.message);
  }
}

module.exports = cleanupExpiredAnnouncements;