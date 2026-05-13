/**
 * Daily Integrity Check Job
 * Phase 16 — Single Source of Truth Architecture
 * 
 * Nightly job that:
 * - Runs system-wide reconciliation
 * - Logs issues to automation_logs
 * - NEVER auto-fixes anything
 * - Sends summary to admin notifications if issues found
 * 
 * Schedule: Daily at 2:00 AM
 */

const reconciliationEngine = require('../../services/integrity/reconciliation.service');
const { pool } = require('../../config/database');

/**
 * Execute the daily integrity check.
 * Called by the scheduler service.
 */
async function run() {
  const startTime = new Date();
  console.log(`[IntegrityJob] Starting daily integrity check at ${startTime.toISOString()}`);

  try {
    // Run system-wide reconciliation
    const report = await reconciliationEngine.reconcileSystem();

    // Log summary
    console.log(`[IntegrityJob] Check complete:
      - Workers checked: ${report.totalWorkers}
      - Workers with issues: ${report.workersWithIssues}
      - Total issues: ${report.totalIssuesFound}
      - High: ${report.bySeverity.high}
      - Medium: ${report.bySeverity.medium}
      - Low: ${report.bySeverity.low}
    `);

    // Log to automation_logs if table exists
    await _logToAutomationLogs(report, startTime);

    // If high-severity issues found, notify admins
    if (report.bySeverity.high > 0) {
      await _notifyAdmins(report);
    }

    return {
      success: true,
      report,
      duration: Date.now() - startTime.getTime(),
    };
  } catch (error) {
    console.error('[IntegrityJob] Failed:', error.message);
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime.getTime(),
    };
  }
}

/**
 * Log integrity check results to automation_logs.
 * Gracefully handles if table doesn't exist yet.
 */
async function _logToAutomationLogs(report, startTime) {
  try {
    await pool.query(
      `INSERT INTO automation_logs (event_type, event_data, severity, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [
        'integrity_check_completed',
        JSON.stringify({
          totalWorkers: report.totalWorkers,
          workersWithIssues: report.workersWithIssues,
          totalIssues: report.totalIssuesFound,
          bySeverity: report.bySeverity,
          duration: Date.now() - startTime.getTime(),
        }),
        report.bySeverity.high > 0 ? 'high' : report.bySeverity.medium > 0 ? 'medium' : 'low',
      ]
    );

    // Log individual high-severity issues separately for audit trail
    for (const workerReport of report.details) {
      for (const issue of workerReport.issues) {
        if (issue.severity === 'high') {
          await pool.query(
            `INSERT INTO automation_logs (event_type, event_data, severity, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [
              `integrity_issue_${issue.ruleId}`,
              JSON.stringify({
                workerId: workerReport.workerId,
                issue: issue,
              }),
              'high',
            ]
          );
        }
      }
    }

    console.log('[IntegrityJob] Logged to automation_logs');
  } catch (error) {
    // automation_logs table may not exist yet — log but don't fail
    console.warn('[IntegrityJob] Could not log to automation_logs:', error.message);
  }
}

/**
 * Notify admins if high-severity issues found.
 * Uses existing notification system if available.
 */
async function _notifyAdmins(report) {
  try {
    // Get admin user IDs
    const admins = await pool.query(
      `SELECT id FROM users WHERE role = 'admin' AND status = 'active'`
    );

    if (admins.rows.length === 0) {
      console.warn('[IntegrityJob] No active admins to notify');
      return;
    }

    const message = `⚠️ Integrity Check Found ${report.bySeverity.high} High-Severity Issues\n
      ${report.workersWithIssues} workers affected out of ${report.totalWorkers}.\n
      Review the integrity dashboard for details.`;

    // Insert notifications for each admin
    for (const admin of admins.rows) {
      try {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            admin.id,
            'integrity_alert',
            'Daily Integrity Check — Issues Found',
            message,
          ]
        );
      } catch (notifError) {
        // notifications table schema may vary
        console.warn('[IntegrityJob] Could not create notification:', notifError.message);
      }
    }

    console.log(`[IntegrityJob] Notified ${admins.rows.length} admins`);
  } catch (error) {
    console.warn('[IntegrityJob] Could not notify admins:', error.message);
  }
}

module.exports = { run };