/**
 * Truth Registry
 * Phase 16 — Single Source of Truth Architecture
 * 
 * DEFINES SYSTEM-WIDE DATA INTEGRITY RULES.
 * 
 * This is the constitutional document for Sajilo data governance.
 * Every metric, every stat, every derived field MUST trace back to rules defined here.
 * 
 * NO EXCEPTIONS.
 */

const TRUTH_REGISTRY = {
  // ─── DOMAIN: Bookings ──────────────────────────────────────────
  bookings: {
    sourceTable: 'bookings',
    authoritativeFields: [
      'id', 'customer_id', 'worker_id', 'service_name', 'job_size',
      'status', 'schedule_date', 'schedule_time', 'price',
      'profession_id', 'service_id', 'services_snapshot', 'booking_total_price',
      'created_at', 'updated_at',
    ],
    allowedWriters: [
      'bookings.controller',       // create, accept, reject
      'bookingCommandDispatcher',  // status transitions
    ],
    derivedFields: {
      completed_jobs: {
        sql: "COUNT(*) FILTER (WHERE status = 'completed')",
        description: 'Total completed bookings for a worker',
        owners: ['metricsEngine'],
      },
      cancellation_rate: {
        sql: "ROUND(COUNT(*) FILTER (WHERE status = 'cancelled') * 100.0 / NULLIF(COUNT(*), 0))",
        description: 'Percentage of bookings cancelled',
        owners: ['metricsEngine'],
      },
      completion_rate: {
        sql: "ROUND(COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled')), 0))",
        description: 'Completion rate excluding pending/active',
        owners: ['metricsEngine'],
      },
      acceptance_rate: {
        sql: "ROUND(COUNT(*) FILTER (WHERE status IN ('accepted', 'onway', 'working', 'completed')) * 100.0 / NULLIF(COUNT(*), 0))",
        description: 'Percentage of bookings accepted',
        owners: ['metricsEngine'],
      },
      active_bookings_count: {
        sql: "COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled'))",
        description: 'Currently active bookings',
        owners: ['metricsEngine'],
      },
    },
  },

  // ─── DOMAIN: Payments ──────────────────────────────────────────
  payments: {
    sourceTable: 'payments',
    authoritativeFields: [
      'id', 'booking_id', 'customer_id', 'worker_id', 'method', 'status',
      'subtotal', 'platform_fee', 'worker_amount', 'final_total',
      'invoice_number', 'paid_at', 'created_at', 'updated_at',
    ],
    allowedWriters: [
      'payments.controller',       // confirm cash payment
      'invoice.service',           // invoice generation
    ],
    derivedFields: {
      total_earnings: {
        sql: "COALESCE(SUM(final_total), 0)",
        description: 'Total earnings from paid payments',
        owners: ['metricsEngine'],
        condition: "status = 'paid'",
      },
      pending_earnings: {
        sql: "COALESCE(SUM(final_total), 0)",
        description: 'Earnings from unpaid/pending payments',
        owners: ['metricsEngine'],
        condition: "status IN ('pending_cash', 'unpaid')",
      },
      average_invoice_value: {
        sql: "COALESCE(AVG(final_total), 0)",
        description: 'Average value of paid invoices',
        owners: ['metricsEngine'],
        condition: "status = 'paid'",
      },
    },
  },

  // ─── DOMAIN: Reviews ───────────────────────────────────────────
  reviews: {
    sourceTable: 'reviews',
    authoritativeFields: [
      'id', 'booking_id', 'customer_id', 'worker_id', 'rating', 'review_text', 'created_at',
    ],
    allowedWriters: [
      'reviews.controller',        // create review
    ],
    derivedFields: {
      average_rating: {
        sql: "COALESCE(AVG(rating)::numeric(10,1), 0)",
        description: 'Average rating for a worker',
        owners: ['metricsEngine'],
      },
      review_count: {
        sql: "COUNT(*)::int",
        description: 'Total number of reviews',
        owners: ['metricsEngine'],
      },
    },
  },

  // ─── DOMAIN: Cancellations ─────────────────────────────────────
  cancellations: {
    sourceTable: 'booking_cancellations',
    authoritativeFields: [
      'id', 'booking_id', 'cancelled_by', 'reason', 'created_at',
    ],
    allowedWriters: [
      'bookings.controller',       // cancel booking flow
    ],
    derivedFields: {
      cancellation_reasons_breakdown: {
        sql: "SELECT reason, COUNT(*)::int AS count FROM booking_cancellations GROUP BY reason",
        description: 'Cancellation reasons distribution',
        owners: ['metricsEngine'],
      },
    },
  },

  // ─── DOMAIN: Workers (Identity only — stats are DERIVED) ────────
  workers: {
    sourceTable: 'users',
    authoritativeFields: [
      'id', 'client_id', 'name', 'email', 'phone', 'photo_url', 'role',
      'status', 'is_online', 'verification_status', 'skills', 'bio',
      'hourly_rate', 'primary_skill', 'created_at', 'created_by',
    ],
    allowedWriters: [
      'auth.controller',           // registration
      'users.controller',          // profile updates
      'admin.controller',          // approval/rejection
    ],
    // ⚠️ IMPORTANT: total_earnings and completed_jobs in users table are CACHED SNAPSHOTS ONLY.
    // NEVER use them as source of truth. Always compute from payments + bookings.
    nonAuthoritativeFields: [
      'total_earnings',   // ← DERIVED from payments, cached for quick display only
      'completed_jobs',   // ← DERIVED from bookings, cached for quick display only
    ],
  },

  // ─── CROSS-DOMAIN RECONCILIATION RULES ─────────────────────────
  reconciliationRules: [
    {
      id: 'payment_booking_mismatch',
      description: 'Payment exists but booking status is not completed',
      severity: 'high',
      check: 'payments.status = paid AND linked booking.status != completed',
    },
    {
      id: 'missing_review_after_completion',
      description: 'Booking completed more than 7 days ago with no review',
      severity: 'low',
      check: 'booking.status = completed AND completed > 7 days AND no review exists',
    },
    {
      id: 'orphan_booking',
      description: 'Booking has no linked payment record',
      severity: 'medium',
      check: 'booking.status = completed AND no payment record exists',
    },
    {
      id: 'duplicate_payment',
      description: 'Multiple paid payments for same booking',
      severity: 'high',
      check: 'COUNT(payments WHERE status = paid AND booking_id = X) > 1',
    },
    {
      id: 'worker_stats_mismatch',
      description: 'Cached worker stats differ from computed values',
      severity: 'medium',
      check: 'users.completed_jobs != COUNT(bookings WHERE status = completed)',
    },
    {
      id: 'cancellation_without_record',
      description: 'Booking cancelled but no cancellation record exists',
      severity: 'medium',
      check: 'booking.status = cancelled AND no booking_cancellations record',
    },
  ],

  // ─── COMPUTATION OWNERSHIP ─────────────────────────────────────
  computationOwners: {
    metricsEngine: {
      description: 'Sole owner of all derived metric computation',
      allowedOperations: ['READ_ALL_TABLES', 'RETURN_COMPUTED_METRICS'],
      forbiddenOperations: ['WRITE_ANY_TABLE', 'CACHE_METRICS', 'UPDATE_USER_STATS'],
    },
    reconciliationEngine: {
      description: 'Sole owner of integrity checks and mismatch detection',
      allowedOperations: ['READ_ALL_TABLES', 'RETURN_MISMATCH_REPORTS', 'LOG_TO_AUTOMATION_LOGS'],
      forbiddenOperations: ['AUTO_FIX', 'WRITE_TO_SOURCE_TABLES', 'MODIFY_DATA'],
    },
    adminDashboard: {
      description: 'Consumer only — reads from metrics engine, never computes',
      allowedOperations: ['READ_METRICS_API'],
      forbiddenOperations: ['DIRECT_DB_QUERIES_FOR_STATS', 'CACHE_DERIVED_VALUES'],
    },
  },

  // ─── FORBIDDEN PATTERNS ────────────────────────────────────────
  forbiddenPatterns: [
    'Direct UPDATE of users.total_earnings outside payment flow',
    'Direct UPDATE of users.completed_jobs outside booking completion',
    'Computing worker stats in frontend',
    'Multiple services computing the same metric differently',
    'Caching derived values without invalidation strategy',
  ],
};

module.exports = TRUTH_REGISTRY;