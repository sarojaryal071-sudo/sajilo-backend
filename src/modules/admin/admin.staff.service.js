const { pool } = require('../../config/database');
const bcrypt = require('bcryptjs');

// Map role slugs to 3-letter client ID prefixes
async function generateStaffClientId(roleSlug) {
  // Derive prefix from role slug (first 3 letters, hyphens removed, uppercase)
  const prefix = roleSlug.replace(/-/g, '').substring(0, 3).toUpperCase();
  const likePattern = `A${prefix}%`;

  const result = await pool.query(
    `SELECT COUNT(*) FROM users WHERE client_id LIKE $1`,
    [likePattern]
  );
  const count = parseInt(result.rows[0].count) + 1;
  const number = String(count).padStart(3, '0');

  return `A${prefix}${number}`;
}

async function createStaff({ email, password, name, role, createdBy }) {
  if (!email || !password || !name || !role || !createdBy) {
    throw new Error('email, password, name, role, and createdBy are required');
  }

  // Resolve role slug to role_id
  const roleResult = await pool.query(`SELECT id FROM roles WHERE slug = $1`, [role]);
  if (roleResult.rows.length === 0) throw new Error(`Unknown role: ${role}`);
  const roleId = roleResult.rows[0].id;

  const clientId = await generateStaffClientId(role);
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, role_id, client_id, status, created_by)
     VALUES ($1, $2, $3, 'admin', $4, $5, 'active', $6)
     RETURNING id, email, name, role, status, client_id`,
    [email.trim().toLowerCase(), passwordHash, name.trim(), roleId, clientId, createdBy]
  );

  return result.rows[0];
}

async function listStaff() {
  const result = await pool.query(
    `SELECT u.id, u.email, u.name, u.role, u.status, u.client_id, u.role_id,
            r.slug AS role_slug, r.name AS role_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.role IN ('admin', 'moderator', 'support_agent')
        OR u.role_id IS NOT NULL
     ORDER BY u.created_at DESC`
  );
  return result.rows;
}

async function toggleStaffStatus(userId, active) {
  const newStatus = active ? 'active' : 'inactive';
  const result = await pool.query(
    `UPDATE users SET status = $1, updated_at = NOW()
     WHERE id = $2 AND (role IN ('admin','moderator','support_agent') OR role_id IS NOT NULL)
     RETURNING id, email, name, role, status, client_id`,
    [newStatus, userId]
  );
  if (result.rows.length === 0) throw new Error('Staff account not found');
  return result.rows[0];
}

module.exports = { createStaff, listStaff, toggleStaffStatus };