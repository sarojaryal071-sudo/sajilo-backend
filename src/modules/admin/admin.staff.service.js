// sajilo-backend/src/modules/admin/admin.staff.service.js
const { pool } = require('../../config/database');
const bcrypt = require('bcryptjs');                     // ← added

/**
 * Create a new staff account.
 */
async function createStaff({ email, password, name, role, createdBy }) {
  if (!email || !password || !name || !role || !createdBy) {
    throw new Error('email, password, name, role, and createdBy are required');
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, status, created_by)
     VALUES ($1, $2, $3, $4, 'active', $5)
     RETURNING id, email, name, role, status, client_id`,
    [email.trim().toLowerCase(), passwordHash, name.trim(), role, createdBy]
  );

  return result.rows[0];
}

/**
 * List all staff accounts.
 */
async function listStaff() {
  const result = await pool.query(
    `SELECT id, email, name, role, status, client_id, created_by, created_at
     FROM users
     WHERE role IN ('admin', 'moderator', 'support_agent')
     ORDER BY created_at DESC`
  );
  return result.rows;
}

/**
 * Toggle a staff account's active status.
 */
async function toggleStaffStatus(userId, active) {
  const newStatus = active ? 'active' : 'inactive';
  const result = await pool.query(
    `UPDATE users SET status = $1, updated_at = NOW()
     WHERE id = $2 AND role IN ('admin','moderator','support_agent')
     RETURNING id, email, name, role, status`,
    [newStatus, userId]
  );
  if (result.rows.length === 0) throw new Error('Staff account not found');
  return result.rows[0];
}

module.exports = { createStaff, listStaff, toggleStaffStatus };