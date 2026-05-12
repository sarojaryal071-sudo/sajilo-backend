// sajilo-backend/src/modules/admin/announcements.service.js
const { pool } = require('../../config/database');

/**
 * Create a new announcement.
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.message
 * @param {string[]} [params.targetRoles] - e.g. ['worker','customer']
 * @param {boolean} [params.isDismissible] - default true
 * @param {string|null} [params.expiresAt] - ISO date string or null
 * @param {number} params.createdBy - admin user ID
 * @returns {Object} the created announcement
 */
async function create({ title, message, targetRoles = ['worker','customer'], isDismissible = true, expiresAt = null, createdBy }) {
  if (!title || !message || !createdBy) {
    throw new Error('title, message, and createdBy are required');
  }

  const result = await pool.query(
    `INSERT INTO announcements (title, message, target_roles, is_dismissible, expires_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [title, message, targetRoles, isDismissible, expiresAt ? new Date(expiresAt).toISOString() : null, createdBy]
  );
  return result.rows[0];
}

/**
 * Get active announcements for a given user role.
 * @param {string} role - 'worker', 'customer', or 'admin'
 * @returns {Array} announcements that have not expired and target this role
 */
async function getActiveForRole(role) {
  const result = await pool.query(
    `SELECT * FROM announcements
     WHERE (expires_at IS NULL OR expires_at > NOW())
       AND $1 = ANY(target_roles)
     ORDER BY created_at DESC`,
    [role]
  );
  return result.rows;
}

/**
 * Get all announcements (admin view).
 * @returns {Array}
 */
async function getAll() {
  const result = await pool.query(
    'SELECT * FROM announcements ORDER BY created_at DESC'
  );
  return result.rows;
}

/**
 * Update an announcement.
 * @param {number} id
 * @param {Object} fields - any subset of { title, message, targetRoles, isDismissible, expiresAt }
 * @returns {Object} updated announcement
 */
async function update(id, fields) {
  const allowed = ['title','message','target_roles','is_dismissible','expires_at'];
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      setClauses.push(`${key} = $${paramIndex++}`);
      values.push(key === 'expires_at' && fields[key] ? new Date(fields[key]).toISOString() : fields[key]);
    }
  }
  if (setClauses.length === 0) throw new Error('No fields to update');
  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE announcements SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0];
}

/**
 * Delete an announcement.
 * @param {number} id
 */
async function remove(id) {
  await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
}

module.exports = { create, getActiveForRole, getAll, update, remove };