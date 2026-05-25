// sajilo-backend/src/middleware/permission.guard.js
const { hasPermission } = require('../config/permissionRegistry');
const { pool } = require('../config/database');

/**
 * Middleware that checks if the authenticated user has the required permission.
 * Checks database first (via role_id), then falls back to legacy map.
 * @param {string} requiredPermission - e.g. 'manage_disputes'
 */
function permissionGuard(requiredPermission) {
  return async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // 1. Legacy admin without role_id → full access (backward compat)
    if (req.user.role === 'admin' && !req.user.role_id) {
      return next();
    }

    // 2. Check database via role_id
    if (req.user.role_id) {
      const permResult = await pool.query(
        `SELECT 1 FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1 AND p.key = $2`,
        [req.user.role_id, requiredPermission]
      );
      if (permResult.rows.length > 0) return next();

      // Also check if super-admin
      const superResult = await pool.query(
        `SELECT 1 FROM roles WHERE id = $1 AND slug = 'super-admin'`,
        [req.user.role_id]
      );
      if (superResult.rows.length > 0) return next();
    }

    // 3. Fallback to legacy map
    if (hasPermission(req.user.role, requiredPermission)) {
      return next();
    }

    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

module.exports = permissionGuard;