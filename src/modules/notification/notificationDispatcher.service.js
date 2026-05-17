const { pool } = require('../../config/database');
const notificationService = require('./notification.service');

/**
 * Resolve recipients based on target specification.
 * Returns an array of { user_id, user_role } objects.
 */
async function resolveRecipients(target) {
  const { type, value } = target || {};

  switch (type) {
    case 'all': {
      const { rows } = await pool.query('SELECT id, role FROM users WHERE status = $1', ['active']);
      return rows.map(r => ({ user_id: r.id, user_role: r.role }));
    }

    case 'role': {
      const role = value; // 'customer', 'worker', 'admin'
      const { rows } = await pool.query('SELECT id, role FROM users WHERE role = $1 AND status = $2', [role, 'active']);
      return rows.map(r => ({ user_id: r.id, user_role: r.role }));
    }

    case 'profession': {
      // value can be profession name or code; match via worker_professions and primary_skill
      const profession = value;
      const { rows } = await pool.query(
        `SELECT DISTINCT u.id, u.role
         FROM users u
         LEFT JOIN worker_professions wp ON u.id = wp.worker_id
         LEFT JOIN professions p ON wp.profession_id = p.id
         WHERE u.role = 'worker' AND u.status = 'active'
           AND (p.name ILIKE $1 OR p.code ILIKE $1 OR u.primary_skill ILIKE $1)`,
        [profession]
      );
      return rows.map(r => ({ user_id: r.id, user_role: r.role }));
    }

    case 'user': {
      const ids = Array.isArray(value) ? value : [value];
      const { rows } = await pool.query('SELECT id, role FROM users WHERE id = ANY($1) AND status = $2', [ids, 'active']);
      return rows.map(r => ({ user_id: r.id, user_role: r.role }));
    }

    default:
      throw new Error(`Invalid target type: ${type}`);
  }
}

/**
 * Dispatch a notification to multiple users based on the target.
 * @param {Object} payload - { title, message, type, target, created_by }
 * @returns {Object} { count, recipients }
 */
async function dispatchNotification(payload) {
  const { title, message, type, target, created_by } = payload;

  if (!title || !target || !target.type) {
    throw new Error('Missing required fields: title and target');
  }

  const recipients = await resolveRecipients(target);

  if (recipients.length === 0) {
    return { count: 0, recipients: [] };
  }

  const created = [];
  for (const { user_id, user_role } of recipients) {
    const notif = await notificationService.createNotification({
      userId: user_id,
      userRole: user_role,
      type: type || 'system',
      title,
      message: message || null,
      entityType: 'admin_dispatch',
      entityId: null,
      metadata: {
        target_type: target.type,
        target_value: target.value,
        created_by,
      },
    });
    created.push(notif);
  }

  return { count: created.length, recipients };
}

module.exports = { dispatchNotification };