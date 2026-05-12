// sajilo-backend/src/config/permissionRegistry.js
// Phase 13B – Role & Permission Engine

const PERMISSIONS = {
  MANAGE_WORKERS:       'manage_workers',       // view, approve, suspend workers
  MANAGE_CUSTOMERS:     'manage_customers',     // view, suspend customers
  MANAGE_BOOKINGS:      'manage_bookings',      // view, cancel bookings
  MANAGE_PAYMENTS:      'manage_payments',      // view, refund payments
  MANAGE_SERVICES:      'manage_services',      // profession/service catalogue
  MANAGE_ANNOUNCEMENTS: 'manage_announcements', // create/edit announcements
  MANAGE_TICKETS:       'manage_tickets',       // assign, resolve support tickets
  MANAGE_FEATURE_FLAGS: 'manage_feature_flags', // toggle platform features
  VIEW_ANALYTICS:       'view_analytics',       // access analytics dashboard
  VIEW_AUDIT_LOGS:      'view_audit_logs',      // access audit log
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