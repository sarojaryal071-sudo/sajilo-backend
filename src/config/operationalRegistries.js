// sajilo-backend/src/config/operationalRegistries.js
// Centralised source of truth for operational constants.
// Phase 12A – DO NOT modify existing logic yet; only centralise definitions.

// ── Booking Statuses ──────────────────────────────────────────────
const BOOKING_STATUS_REGISTRY = {
  PENDING:    'pending',
  ACCEPTED:   'accepted',
  ONWAY:      'onway',
  WORKING:    'working',
  COMPLETED:  'completed',
  CANCELLED:  'cancelled',
  REJECTED:   'rejected',
};

// ── Payment Statuses ──────────────────────────────────────────────
const PAYMENT_STATUS_REGISTRY = {
  PENDING:        'pending',
  UNPAID:         'unpaid',          // Initial state after auto‑create
  INVOICE_SENT:   'invoice_sent',
  INVOICE_SEEN:   'invoice_seen',
  PENDING_CASH:   'pending_cash',    // After worker confirms invoice
  PAID:           'paid',
  CASH_COLLECTED: 'cash_collected',
  REFUNDED:       'refunded',
  FAILED:         'failed',
};


// ── Notification Types ────────────────────────────────────────────
const NOTIFICATION_TYPE_REGISTRY = {
  BOOKING_CREATED:   'booking_created',
  BOOKING_ACCEPTED:  'booking_accepted',
  BOOKING_REJECTED:  'booking_rejected',
  BOOKING_ONWAY:     'booking_onway',
  BOOKING_WORKING:   'booking_working',
  BOOKING_COMPLETED: 'booking_completed',
  BOOKING_CANCELLED: 'booking_cancelled',
  PAYMENT_UPDATED:   'payment_updated',
  REVIEW_CREATED:    'review_created',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  // Add future notification types here
};

// ── Moderation Statuses ──────────────────────────────────────────
const MODERATION_STATUS_REGISTRY = {
  ACTIVE:       'active',
  SUSPENDED:    'suspended',
  UNDER_REVIEW: 'under_review',
};

// ── Socket Event Names (standardised) ─────────────────────────────
const SOCKET_EVENT_REGISTRY = {
  // Booking lifecycle
  BOOKING_CREATED:   'booking.created',
  BOOKING_ACCEPTED:  'booking.accepted',
  BOOKING_REJECTED:  'booking.rejected',
  BOOKING_ONWAY:     'booking.onway',
  BOOKING_WORKING:   'booking.working',
  BOOKING_COMPLETED: 'booking.completed',
  BOOKING_UPDATED:   'booking.updated',

  // Worker
  WORKER_STATUS_CHANGED: 'worker:statusChanged',

  // Payment
  PAYMENT_UPDATED: 'payment.updated',

  // Review
  REVIEW_CREATED: 'review.created',

  // Notifications
  NOTIFICATION_CREATED: 'notification.created',

  // Worker services & pricing (already in use, added here for centralisation)
  WORKER_SERVICES_UPDATED: 'worker.services.updated',
};

module.exports = {
  BOOKING_STATUS_REGISTRY,
  PAYMENT_STATUS_REGISTRY,
  NOTIFICATION_TYPE_REGISTRY,
  MODERATION_STATUS_REGISTRY,
  SOCKET_EVENT_REGISTRY,
};