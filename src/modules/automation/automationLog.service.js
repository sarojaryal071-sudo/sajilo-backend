// sajilo-backend/src/modules/automation/automationLog.service.js
const { pool } = require('../../config/database');

/**
 * Log an automation job execution.
 * @param {Object} params
 * @param {string}  params.automationKey - matches automation id
 * @param {string}  params.status        - 'success' or 'failure'
 * @param {string}  [params.entityType]
 * @param {number}  [params.entityId]
 * @param {string}  [params.errorMessage]
 * @param {Object}  [params.metadata]
 * @param {Date}    [params.finishedAt]  - defaults to NOW()
 */
async function logExecution({
  automationKey,
  status,
  entityType = null,
  entityId = null,
  errorMessage = null,
  metadata = null,
  finishedAt = new Date(),
}) {
  if (!automationKey || !status) {
    throw new Error('automationKey and status are required');
  }

  await pool.query(
    `INSERT INTO automation_logs
      (automation_key, status, entity_type, entity_id, error_message, metadata, started_at, finished_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), $7)`,
    [
      automationKey,
      status,
      entityType,
      entityId,
      errorMessage,
      metadata ? JSON.stringify(metadata) : null,
      finishedAt,
    ]
  );
}

module.exports = { logExecution };