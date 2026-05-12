// sajilo-backend/src/config/permissionRegistry.js
// Phase 13B – Role & Permission Engine

const PERMISSIONS = {
  MANAGE_WORKERS:       'manage_workers',
  MANAGE_CUSTOMERS:     'manage_customers',
  MANAGE_BOOKINGS:      'manage_bookings',
  MANAGE_PAYMENTS:      'manage_payments',
  MANAGE_SERVICES:      'manage_services',
  MANAGE_ANNOUNCEMENTS: 'manage_announcements',
  MANAGE_TICKETS:       'manage_tickets',
  MANAGE_FEATURE_FLAGS: 'manage_feature_flags',
  MANAGE_STAFF:         'manage_staff',
  MANAGE_POLICIES:      'manage_policies',          // create, edit, deactivate staff accounts
  VIEW_ANALYTICS:       'view_analytics',
  VIEW_AUDIT_LOGS:      'view_audit_logs',
};

// Role‑to‑permission mapping (can be extended with DB later)
const ROLE_PERMISSIONS = {
  super_admin: Object.values(PERMISSIONS),   // all permissions
  admin:       Object.values(PERMISSIONS),   // same for now; can be reduced later
  moderator: [
    PERMISSIONS.MANAGE_WORKERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.MANAGE_BOOKINGS,
    PERMISSIONS.MANAGE_TICKETS,
  ],
  support_agent: [
    PERMISSIONS.MANAGE_TICKETS,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
};

/**
 * Check if a role has a specific permission.
 * @param {string} role - 'super_admin', 'admin', 'moderator', 'support_agent'
 * @param {string} permission - one of PERMISSIONS values
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(permission);
}

module.exports = { PERMISSIONS, ROLE_PERMISSIONS, hasPermission };