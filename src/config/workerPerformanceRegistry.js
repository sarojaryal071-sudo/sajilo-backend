/**
 * Worker Performance Registry
 * Phase 14F — Worker Performance & Quality Intelligence
 * 
 * Centralized config for:
 * - Trust score weights
 * - Performance badge rules
 * - Reliability thresholds
 * - Response speed labels
 * - Ranking minimums
 * 
 * ALL thresholds live here. No magic numbers in services.
 */

const WORKER_PERFORMANCE_REGISTRY = {
  // Scoring weights (adjusted to sum 1.0)
  scoreWeights: {
    completionRate: 0.30,
    reviewAverage: 0.25,
    acceptanceRate: 0.15,
    responseSpeed: 0.10,
    cancellationRate: -0.10, // negative weight — penalizes
    bookingVolume: 0.15,
    activityRecency: 0.15,
  },

  // Trust score thresholds
  trustTiers: {
    excellent: { min: 85, label: 'Excellent', color: '#10B981' },
    good: { min: 70, label: 'Good', color: '#3B82F6' },
    fair: { min: 50, label: 'Fair', color: '#F59E0B' },
    poor: { max: 49, label: 'Poor', color: '#EF4444' },
  },

  // Performance badges (config-driven, admin-configurable later)
  badges: {
    reliableWorker: {
      id: 'reliable_worker',
      label: 'Reliable Worker',
      icon: 'shield-check',
      color: '#10B981',
      requirements: {
        completionRate: { min: 90 },
        cancellationRate: { max: 10 },
        totalCompletedBookings: { min: 20 },
      },
      priority: 1,
    },
    fastResponder: {
      id: 'fast_responder',
      label: 'Fast Responder',
      icon: 'lightning-bolt',
      color: '#3B82F6',
      requirements: {
        avgResponseTimeMinutes: { max: 5 },
        acceptanceRate: { min: 80 },
        totalCompletedBookings: { min: 10 },
      },
      priority: 2,
    },
    topRated: {
      id: 'top_rated',
      label: 'Top Rated',
      icon: 'star',
      color: '#F59E0B',
      requirements: {
        reviewAverage: { min: 4.5 },
        reviewCount: { min: 15 },
        completionRate: { min: 85 },
      },
      priority: 3,
    },
    highlyActive: {
      id: 'highly_active',
      label: 'Highly Active',
      icon: 'trending-up',
      color: '#8B5CF6',
      requirements: {
        totalCompletedBookings: { min: 50 },
        activeBookingsLast30Days: { min: 15 },
      },
      priority: 4,
    },
    trustedVeteran: {
      id: 'trusted_veteran',
      label: 'Trusted Veteran',
      icon: 'award',
      color: '#EC4899',
      requirements: {
        totalCompletedBookings: { min: 100 },
        completionRate: { min: 95 },
        reviewAverage: { min: 4.7 },
        accountAgeDays: { min: 180 },
      },
      priority: 5,
    },
  },

  // Response speed labels (for client display)
  responseSpeedLabels: {
    fast: { maxMinutes: 5, label: 'Usually responds within 5 min', color: '#10B981' },
    moderate: { maxMinutes: 15, label: 'Usually responds within 15 min', color: '#3B82F6' },
    slow: { maxMinutes: 60, label: 'May take up to 1 hour', color: '#F59E0B' },
    verySlow: { minMinutes: 61, label: 'Response time varies', color: '#EF4444' },
  },

  // Admin operational thresholds (for flagging)
  adminFlags: {
    highCancellation: { threshold: 30, label: 'High Cancellation Rate', severity: 'warning' },
    lowCompletion: { threshold: 60, label: 'Low Completion Rate', severity: 'danger' },
    lowRated: { threshold: 3.0, label: 'Low Rated', severity: 'warning' },
    inactive: { daysSinceLastBooking: 30, label: 'Inactive Worker', severity: 'info' },
    criticalRisk: { trustScoreMax: 40, label: 'Critical Risk', severity: 'danger' },
  },

  // Minimum requirements for ranking visibility
  rankingMinimums: {
    minCompletedBookings: 5,
    minReviewCount: 3,
  },

  // Cache TTL (seconds) for computed metrics
  cacheTTL: {
    workerMetrics: 300,      // 5 minutes
    badgeCalculation: 600,   // 10 minutes
    trustScore: 300,         // 5 minutes
  },

  // Performance metric calculation windows
  windows: {
    recentActivityDays: 30,
    responseTimeWindowDays: 90,
    bookingVolumeWindowDays: 90,
  },
};

module.exports = WORKER_PERFORMANCE_REGISTRY;