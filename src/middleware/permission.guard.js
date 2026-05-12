// sajilo-backend/src/middleware/permission.guard.js
const { hasPermission } = require('../config/permissionRegistry');

/**
 * Middleware that checks if the authenticated user's role has the required permission.
 * @param {string} requiredPermission - one of the PERMISSIONS constants
 * @returns {function} Express middleware
 */
function permissionGuard(requiredPermission) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasPermission(userRole, requiredPermission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

module.exports = permissionGuard;