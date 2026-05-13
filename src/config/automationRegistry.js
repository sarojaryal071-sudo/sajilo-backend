// sajilo-backend/src/config/automationRegistry.js
// Phase 13D – Automation & Operational Workflows
// Centralised definitions for all automatable jobs.

const AUTOMATION_JOBS = {
  // ── Cleanup ──────────────────────────────────────
  CLEANUP_EXPIRED_ANNOUNCEMENTS: {
    id: 'cleanup_expired_announcements',
    enabled: true,
    intervalMs: 60 * 60 * 1000,          // every hour
    description: 'Removes announcements that have passed their expiry date',
  },
  ARCHIVE_OLD_NOTIFICATIONS: {
    id: 'archive_old_notifications',
    enabled: true,
    intervalMs: 24 * 60 * 60 * 1000,     // daily
    description: 'Archives read notifications older than 30 days',
  },
  CLEANUP_TEMP_ACTIVITY_LOGS: {
    id: 'cleanup_temp_activity_logs',
    enabled: false,                       // disabled by default
    intervalMs: 7 * 24 * 60 * 60 * 1000, // weekly
    description: 'Removes activity logs older than 90 days (configurable via policy)',
  },

  // ── Ticket Management ────────────────────────────
  AUTO_CLOSE_STALE_TICKETS: {
    id: 'auto_close_stale_tickets',
    enabled: true,
    intervalMs: 12 * 60 * 60 * 1000,     // twice a day
    description: 'Automatically closes resolved tickets with no activity for 7 days',
  },

  // ── User / Moderation ────────────────────────────
  FLAG_SUSPICIOUS_CANCELLATIONS: {
    id: 'flag_suspicious_cancellations',
    enabled: false,                       // optional
    intervalMs: 60 * 60 * 1000,          // hourly
    description: 'Flags workers with excessive cancellations in the last 24h',
  },
  SCAN_INACTIVE_USERS: {
    id: 'scan_inactive_users',
    enabled: true,
    intervalMs: 24 * 60 * 60 * 1000,     // daily
    description: 'Scans for users inactive for > 90 days and updates their status',
  },

  // ── Analytics / Aggregation ──────────────────────
  NIGHTLY_ANALYTICS_AGGREGATION: {
    id: 'nightly_analytics_aggregation',
    enabled: true,
    intervalMs: 24 * 60 * 60 * 1000,     // daily (will be scheduled at midnight)
    description: 'Pre‑computes heavy analytics aggregates for the dashboard',
  },
};

module.exports = { AUTOMATION_JOBS };
