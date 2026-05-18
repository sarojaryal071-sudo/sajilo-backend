const { pool } = require('../../config/database');

/**
 * Insert an audit log entry. Must never throw – audit failures are silent.
 */
async function logSettingsChange({
  userId,
  section,
  fieldPath,
  oldValue,
  newValue,
  actionType,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    // Never log actual password values
    if (fieldPath && (fieldPath.includes('password') || fieldPath.includes('currentPassword') || fieldPath.includes('newPassword'))) {
      oldValue = null;
      newValue = null;
    }

    // Mask sensitive financial values (e.g., account numbers)
    const safeOld = maskSensitive(oldValue);
    const safeNew = maskSensitive(newValue);

    await pool.query(
      `INSERT INTO settings_audit_logs (user_id, section, field_path, old_value, new_value, action_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, section, fieldPath, JSON.stringify(safeOld), JSON.stringify(safeNew), actionType, ipAddress, userAgent]
    );
  } catch (err) {
    console.error('[SettingsAudit] Failed to write audit log:', err.message);
  }
}

/**
 * Mask sensitive values (e.g. show only last 4 digits of account numbers).
 */
function maskSensitive(value) {
  if (typeof value !== 'string') return value;
  // Mask potential account numbers (simple heuristic: digits length >= 8)
  if (/^\d{8,}$/.test(value)) {
    return '****' + value.slice(-4);
  }
  return value;
}

module.exports = { logSettingsChange };