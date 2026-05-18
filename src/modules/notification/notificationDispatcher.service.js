const { pool } = require('../../config/database');
const notificationService = require('./notification.service');

let dispatchLogTableEnsured = false;
async function ensureDispatchLogTable() {
  if (dispatchLogTableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_dispatches (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      priority VARCHAR(10) DEFAULT 'normal',
      target_type VARCHAR(50) NOT NULL,
      target_value VARCHAR(255),
      created_by INTEGER REFERENCES users(id),
      status VARCHAR(20) DEFAULT 'sent',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  dispatchLogTableEnsured = true;
}

/**
 * Resolve recipients based on target specification.
 * Returns an array of { user_id, user_role } objects.
 */
async function resolveRecipients(target) {
  const { type, value } = target || {};

  switch (type) {
    case 'all': {
      // Match admin UI "All Workers"
      const { rows } = await pool.query('SELECT id, role FROM users WHERE role = $1 AND status = $2', ['worker', 'active']);
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

    case 'online': {
      // Resolve all workers currently marked online
      const { rows } = await pool.query(
        `SELECT id, role FROM users WHERE role = 'worker' AND is_online = true AND status = 'active'`
      );
      return rows.map(r => ({ user_id: r.id, user_role: r.role }));
    }

    case 'category': {
      // Alias for 'profession' – used by admin UI
      const profession = target.category || value;
      if (!profession) throw new Error('Missing category/profession value for target type "category"');
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

    case 'all_users': {
      // All active users regardless of role
      const { rows } = await pool.query(
        `SELECT id, role FROM users WHERE status = $1`,
        ['active']
      );
      return rows.map(r => ({ user_id: r.id, user_role: r.role }));
    }

    case 'all_clients': {
      // All active customers (role = 'customer')
      const { rows } = await pool.query(
        `SELECT id, role FROM users WHERE role = $1 AND status = $2`,
        ['customer', 'active']
      );
      return rows.map(r => ({ user_id: r.id, user_role: r.role }));
    }

    case 'pending_workers': {
      // Workers whose client_id starts with 'P' (not yet approved)
      const { rows } = await pool.query(
        `SELECT id, role FROM users WHERE role = 'worker' AND client_id LIKE $1 AND status = 'active'`,
        ['P%']
      );
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
  const { title, message, type, target, created_by, priority } = payload;

  if (!title || !target || !target.type) {
    throw new Error('Missing required fields: title and target');
  }

  await ensureDispatchLogTable();

  const recipients = await resolveRecipients(target);

  if (recipients.length === 0) {
    return { count: 0, recipients: [] };
  }

  const created = [];
  for (const { user_id, user_role } of recipients) {
    const notif = await notificationService.createNotification({
      userId: user_id,
      userRole: user_role,
      type: type || 'admin',
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

  // Record the dispatch in the log table for admin history
  await pool.query(
    `INSERT INTO notification_dispatches (title, message, priority, target_type, target_value, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [title, message || null, priority || 'normal', target.type, target.category || target.value || null, created_by]
  );

  return { count: created.length, recipients };
}

module.exports = { dispatchNotification };