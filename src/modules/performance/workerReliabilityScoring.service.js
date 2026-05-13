/**
 * Worker Reliability Scoring Service
 * Phase 14F — Worker Performance & Quality Intelligence
 * 
 * Computes:
 * - Trust score (weighted composite)
 * - Trust tier (excellent, good, fair, poor)
 * - Earned badges (based on registry rules)
 * 
 * Pure computation layer — no database access.
 * Consumes metrics from WorkerIntelligenceService.
 */

const WORKER_PERFORMANCE_REGISTRY = require('../../config/workerPerformanceRegistry');
const workerIntelligenceService = require('./workerIntelligence.service');

class WorkerReliabilityScoringService {
  /**
   * Calculate complete reliability profile for a worker
   * @param {string} workerId
   * @returns {Object} reliabilityProfile
   */
  async getReliabilityProfile(workerId) {
    // Step 1: Get raw metrics
    const metrics = await workerIntelligenceService.getWorkerMetrics(workerId);

    // Step 2: Calculate trust score
    const trustScore = this._calculateTrustScore(metrics);

    // Step 3: Determine trust tier
    const trustTier = this._getTrustTier(trustScore);

    // Step 4: Calculate earned badges
    const badges = this._calculateBadges(metrics);

    // Step 5: Build response speed display
    const responseSpeedDisplay = this._getResponseSpeedDisplay(metrics.responseSpeed);

    return {
      workerId,
      trustScore,
      trustTier,
      badges,
      responseSpeedDisplay,
      metrics: {
        completionRate: metrics.completionRate.rate,
        cancellationRate: metrics.cancellationRate.rate,
        acceptanceRate: metrics.acceptanceRate.rate,
        reviewAverage: metrics.reviewAverage,
        reviewCount: metrics.reviewCount,
        totalCompletedBookings: metrics.bookingVolume.totalCompleted,
        totalEarnings: metrics.earningsTotal,
        lastActiveDaysAgo: metrics.lastActivity.daysSinceLastActivity,
      },
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get reliability profiles for multiple workers
   * @param {string[]} workerIds
   * @returns {Object[]}
   */
  async getBulkReliabilityProfiles(workerIds) {
    if (!workerIds || workerIds.length === 0) return [];

    const profiles = await Promise.allSettled(
      workerIds.map(id => this.getReliabilityProfile(id))
    );

    return profiles
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * Calculate trust score from metrics using registry weights
   * @param {Object} metrics
   * @returns {number} trustScore (0-100)
   */
  _calculateTrustScore(metrics) {
    const weights = WORKER_PERFORMANCE_REGISTRY.scoreWeights;

    // Normalize each component to 0-100 scale
    const completionScore = metrics.completionRate.rate * weights.completionRate;
    
    const reviewScore = (metrics.reviewAverage / 5) * 100 * weights.reviewAverage;
    
    const acceptanceScore = metrics.acceptanceRate.rate * weights.acceptanceRate;
    
    // Response speed: faster = higher score
    const responseScore = this._normalizeResponseSpeed(metrics.responseSpeed.averageMinutes) 
      * weights.responseSpeed;
    
    // Cancellation: inverted (lower cancellation = higher score)
    const cancellationPenalty = metrics.cancellationRate.rate * weights.cancellationRate;
    
    // Booking volume: normalized against a reasonable max
    const volumeScore = this._normalizeBookingVolume(metrics.bookingVolume.totalCompleted) 
      * weights.bookingVolume;
    
    // Activity recency: more recent = higher score
    const activityScore = this._normalizeActivityRecency(
      metrics.lastActivity.daysSinceLastActivity
    ) * weights.activityRecency;

    // Sum and clamp to 0-100
    const rawScore = completionScore + reviewScore + acceptanceScore + 
                     responseScore + cancellationPenalty + volumeScore + activityScore;

    return Math.max(0, Math.min(100, Math.round(rawScore)));
  }

  /**
   * Determine trust tier from score
   * @param {number} score
   * @returns {Object} trustTier
   */
  _getTrustTier(score) {
    const tiers = WORKER_PERFORMANCE_REGISTRY.trustTiers;

    if (score >= tiers.excellent.min) return tiers.excellent;
    if (score >= tiers.good.min) return tiers.good;
    if (score >= tiers.fair.min) return tiers.fair;
    return tiers.poor;
  }

  /**
   * Calculate which badges a worker has earned
   * @param {Object} metrics
   * @returns {Object[]} earned badges
   */
  _calculateBadges(metrics) {
    const badgeRules = WORKER_PERFORMANCE_REGISTRY.badges;
    const earnedBadges = [];

    for (const [key, badge] of Object.entries(badgeRules)) {
      const req = badge.requirements;
      let qualifies = true;

      // Check each requirement
      if (req.completionRate && metrics.completionRate.rate < req.completionRate.min) {
        qualifies = false;
      }
      if (req.cancellationRate && metrics.cancellationRate.rate > req.cancellationRate.max) {
        qualifies = false;
      }
      if (req.acceptanceRate && metrics.acceptanceRate.rate < req.acceptanceRate.min) {
        qualifies = false;
      }
      if (req.reviewAverage && metrics.reviewAverage < req.reviewAverage.min) {
        qualifies = false;
      }
      if (req.reviewCount && metrics.reviewCount < req.reviewCount.min) {
        qualifies = false;
      }
      if (req.totalCompletedBookings && metrics.bookingVolume.totalCompleted < req.totalCompletedBookings.min) {
        qualifies = false;
      }
      if (req.activeBookingsLast30Days && metrics.bookingVolume.totalBookings < req.activeBookingsLast30Days.min) {
        qualifies = false;
      }
      if (req.avgResponseTimeMinutes && 
          metrics.responseSpeed.averageMinutes !== null && 
          metrics.responseSpeed.averageMinutes > req.avgResponseTimeMinutes.max) {
        qualifies = false;
      }
      // Skip account age check for now — requires user.created_at not in metrics yet

      if (qualifies) {
        earnedBadges.push({
          id: badge.id,
          label: badge.label,
          icon: badge.icon,
          color: badge.color,
          priority: badge.priority,
        });
      }
    }

    // Sort by priority
    return earnedBadges.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get display object for response speed
   * @param {Object} responseSpeed
   * @returns {Object|null}
   */
  _getResponseSpeedDisplay(responseSpeed) {
    if (!responseSpeed || responseSpeed.averageMinutes === null) {
      return null;
    }
    return responseSpeed.label || null;
  }

  // ─── NORMALIZATION HELPERS ───

  _normalizeResponseSpeed(averageMinutes) {
    if (averageMinutes === null) return 50; // neutral score if no data
    
    // 0-5 min → 100, 5-15 → 75, 15-60 → 40, 60+ → 10
    if (averageMinutes <= 5) return 100;
    if (averageMinutes <= 15) return 75;
    if (averageMinutes <= 60) return 40;
    return 10;
  }

  _normalizeBookingVolume(totalCompleted) {
    // 0 → 0, 50 → 50, 100+ → 100
    if (totalCompleted >= 100) return 100;
    return totalCompleted; // linear 0-100
  }

  _normalizeActivityRecency(daysSinceLastActivity) {
    if (daysSinceLastActivity === null) return 0;
    
    // 0 days → 100, 7 days → 75, 30 days → 30, 90+ → 0
    if (daysSinceLastActivity === 0) return 100;
    if (daysSinceLastActivity <= 7) return 75;
    if (daysSinceLastActivity <= 30) return 30;
    return 0;
  }
}

module.exports = new WorkerReliabilityScoringService();