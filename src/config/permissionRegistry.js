// sajilo-backend/src/config/permissionRegistry.js
// Phase 2 – Database-driven permission registry

const { pool } = require('./database');

/**
 * Check if a user has a specific permission.
 * Resolves the user's role via role_id or legacy role, then checks the database.
 * Falls back to full access for legacy 'admin' users without a role_id.
 */
async function hasPermission(userId, permission) {
  // 1. Get user's role
  const userResult = await pool.query(
    `SELECT role, role_id FROM users WHERE id = $1`,
    [userId]
  );
  if (userResult.rows.length === 0) return false;
  const user = userResult.rows[0];

  // 2. Legacy admin fallback (full access)
  if (user.role === 'admin' && !user.role_id) return true;

  // 3. Super admin bypass
  if (user.role_id) {
    const roleResult = await pool.query(
      `SELECT slug FROM roles WHERE id = $1 AND is_system = TRUE AND slug = 'super-admin'`,
      [user.role_id]
    );
    if (roleResult.rows.length > 0) return true;
  }

  // 4. Check via role_permissions
  if (user.role_id) {
    const permResult = await pool.query(
      `SELECT 1 FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1 AND p.key = $2`,
      [user.role_id, permission]
    );
    if (permResult.rows.length > 0) return true;
  }

  // 5. Fallback to legacy ROLE_PERMISSIONS map (for backward compatibility)
  const { ROLE_PERMISSIONS } = require('./permissionRegistry.legacy');
  const allowed = ROLE_PERMISSIONS[user.role] || [];
  return allowed.includes(permission);
}

// Keep the legacy map for fallback
const ROLE_PERMISSIONS = {
  admin: ['manage_workers', 'manage_customers', 'manage_bookings', 'manage_payments',
          'manage_services', 'manage_announcements', 'manage_tickets', 'manage_feature_flags',
          'manage_staff', 'manage_policies', 'view_analytics', 'view_audit_logs'],
};

module.exports = { hasPermission, ROLE_PERMISSIONS };