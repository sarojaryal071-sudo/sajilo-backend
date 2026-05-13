// sajilo-backend/src/jobs/archiveOldNotifications.job.js
const { pool } = require('../config/database');
const automationLog = require('../modules/automation/automationLog.service');

const OLDER_THAN_DAYS = 30;   // can be moved to a policy later

/**
 * Delete read notifications that are older than OLDER_THAN_DAYS.
 * Unread notifications are never removed.
 */
async function archiveOldNotifications() {
  const startedAt = new Date();
  let status = 'success';
  let errorMessage = null;
  let deletedCount = 0;

  try {
    const result = await pool.query(
      `DELETE FROM notifications
       WHERE is_read = true
         AND created_at < NOW() - INTERVAL '1 day' * $1
       RETURNING id`,
      [OLDER_THAN_DAYS]
    );
    deletedCount = result.rowCount;
    console.log(`[archiveOldNotifications] Deleted ${deletedCount} old read notification(s)`);
  } catch (err) {
    status = 'failure';
    errorMessage = err.message;
    console.error('[archiveOldNotifications] Error:', err.message);
  }

  // Log the execution
  try {
    await automationLog.logExecution({
      automationKey: 'archive_old_notifications',
      status,
      entityType: 'notification',
      entityId: null,
      errorMessage,
      metadata: { deletedCount, olderThanDays: OLDER_THAN_DAYS },
      finishedAt: new Date(),
    });
  } catch (logErr) {
    console.error('[archiveOldNotifications] Failed to log execution:', logErr.message);
  }
}

module.exports = archiveOldNotifications;