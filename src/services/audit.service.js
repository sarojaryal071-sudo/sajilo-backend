// sajilo-backend/src/services/audit.service.js
const { pool } = require('../config/database');

/**
 * Insert an immutable audit event.
 * Never throws – failures are logged to console but never crash the caller.
 */
async function logAuditEvent({
  actor,
  action,
  entityType = null,
  entityId = null,
  entityLabel = null,
  oldValues = null,
  newValues = null,
  metadata = null,
  reason = null,
  req = null,
}) {
  try {
    const actorId       = actor?.id         ?? null;
    const actorClientId = actor?.client_id  ?? null;
    const actorName     = actor?.name       ?? null;
    const actorRole     = actor?.role       ?? 'system';
    const actorRoleId   = actor?.role_id    ?? null;

    // Mask temporary passwords in old/new values
    const safeOld = maskSensitive(oldValues);
    const safeNew = maskSensitive(newValues);

    await pool.query(
      `INSERT INTO audit_logs
         (actor_id, actor_client_id, actor_name, actor_role, actor_role_id,
          action, entity_type, entity_id, entity_label,
          old_value, new_value, metadata, reason,
          ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14,$15)`,
      [
        actorId, actorClientId, actorName, actorRole, actorRoleId,
        action, entityType, entityId, entityLabel,
        safeOld ? JSON.stringify(safeOld) : null,
        safeNew ? JSON.stringify(safeNew) : null,
        metadata ? JSON.stringify(metadata) : null,
        reason || null,
        req?.ip || null,
        req?.headers?.['user-agent'] || null,
      ]
    );
  } catch (err) {
    console.error('[audit.service] Failed to write audit log:', err.message);
  }
}

/** Remove sensitive fields from logged values */
function maskSensitive(values) {
  if (!values || typeof values !== 'object') return values;
  const masked = { ...values };
  if ('password' in masked) masked.password = '***';
  if ('password_hash' in masked) masked.password_hash = '***';
  if ('tempPassword' in masked) masked.tempPassword = '***';
  return masked;
}

module.exports = { logAuditEvent };