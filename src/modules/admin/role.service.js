// sajilo-backend/src/modules/admin/role.service.js
const { pool } = require('../../config/database');

/**
 * Resolve a user's effective role and permissions.
 * Falls back to legacy 'admin' role if no role_id is set.
 */
async function resolveUserAccess(userId) {
  // Get the user
  const userResult = await pool.query(
    `SELECT id, email, name, role, role_id, status, client_id
     FROM users WHERE id = $1`,
    [userId]
  );
  if (userResult.rows.length === 0) return null;
  const user = userResult.rows[0];

  let role = null;
  let permissions = [];

  // If user has a role_id, use the RBAC system
  if (user.role_id) {
    const roleResult = await pool.query(
      `SELECT id, name, slug, description, is_system FROM roles WHERE id = $1`,
      [user.role_id]
    );
    if (roleResult.rows.length > 0) {
      role = roleResult.rows[0];

      // Get permissions for this role
      const permResult = await pool.query(
        `SELECT p.key, p.label, p.section_key
         FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         WHERE rp.role_id = $1
         ORDER BY p.section_key, p.key`,
        [role.id]
      );
      permissions = permResult.rows;
    }
  }

  // Fallback: legacy users with role = 'admin' get super-admin access
  if (!role && user.role === 'admin') {
    // Create a virtual super-admin role
    role = { id: null, name: 'Super Admin', slug: 'super-admin', description: 'Legacy admin', is_system: true };

    const permResult = await pool.query(
      `SELECT key, label, section_key FROM permissions ORDER BY section_key, key`
    );
    permissions = permResult.rows;
  }

  // Build unique section list from permissions
  const sections = [...new Set(permissions.map(p => p.section_key).filter(Boolean))];

  // Determine if user is super admin (bypasses all checks)
  const isSuperAdmin = role.slug === 'super-admin';

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      legacyRole: user.role,
      clientId: user.client_id,
      status: user.status,
    },
    role: {
      id: role.id,
      name: role.name,
      slug: role.slug,
      isSystem: role.is_system,
    },
    permissions: permissions.map(p => p.key),
    sections,
    isSuperAdmin,
  };
}

module.exports = { resolveUserAccess };