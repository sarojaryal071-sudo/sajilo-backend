/**
 * Worker Profile Resolver Service
 * Phase 15 — Unified Data Truth Layer
 * 
 * Aggregates worker data from all relevant tables into a single unified object.
 * Queries: users, worker_applications, worker_professions, worker_services,
 *          bookings (stats), reviews (stats).
 * 
 * Does NOT write. Does NOT modify schema.
 * Output normalized via workerNormalizer.
 */

const { pool } = require('../../config/database');
const { normalizeWorker } = require('../../utils/dataNormalization/workerNormalizer.util');

class WorkerProfileResolver {
  /**
   * Get unified worker profile by user ID
   * @param {number|string} workerId
   * @returns {Object} Normalized worker profile
   */
  async getById(workerId) {
    const [user, application, professions, services, stats] = await Promise.all([
      this._getUser(workerId),
      this._getApplication(workerId),
      this._getProfessions(workerId),
      this._getServices(workerId),
      this._getStats(workerId),
    ]);

    if (!user) return null;

    const raw = {
      ...user,
      ...application,
      professions,
      services,
      ...stats,
    };

    return normalizeWorker(raw);
  }

  /**
   * Get unified profile for the currently authenticated worker
   * @param {number|string} workerId
   * @returns {Object} Normalized worker profile
   */
  async getMyProfile(workerId) {
    return this.getById(workerId);
  }

  // ─── Private Data Fetchers ───

  async _getUser(workerId) {
    const result = await pool.query(
      `SELECT id, client_id, name, email, phone, photo_url, role, bio,
              primary_skill, skills, is_online, status, welcomed,
              verification_status, document_url, hourly_rate,
              total_earnings, completed_jobs, created_at
       FROM users
       WHERE id = $1 AND role = 'worker'`,
      [workerId]
    );
    return result.rows[0] || null;
  }

  async _getApplication(workerId) {
    const result = await pool.query(
      `SELECT primary_role, secondary_roles, service_area, status AS application_status
       FROM worker_applications
       WHERE user_id = $1`,
      [workerId]
    );
    const app = result.rows[0] || {};

    // Parse secondary_roles if stored as JSON string
    if (typeof app.secondary_roles === 'string') {
      try {
        app.secondary_roles = JSON.parse(app.secondary_roles);
      } catch (e) {
        app.secondary_roles = [];
      }
    }

    return app;
  }

  async _getProfessions(workerId) {
    const result = await pool.query(
      `SELECT wp.profession_id,
              p.name AS profession_name, p.icon AS profession_icon
       FROM worker_professions wp
       JOIN professions p ON p.id = wp.profession_id
       WHERE wp.worker_id = $1`,
      [workerId]
    );

    return result.rows.map(r => ({
      id: r.profession_id,
      name: r.profession_name,
      icon: r.profession_icon,
      isPrimary: false, // schema doesn't track primary — default false
    }));
  }

  async _getServices(workerId) {
    const result = await pool.query(
      `SELECT ws.id, ws.service_id, ws.custom_label, ws.custom_label_np,
              ws.price, ws.is_active, ws.profession_id,
              p.name AS profession_name,
              ps.label AS service_label, ps.label_np AS service_label_np
       FROM worker_services ws
       LEFT JOIN professions p ON p.id = ws.profession_id
       LEFT JOIN profession_services ps ON ps.id = ws.service_id
       WHERE ws.worker_id = $1`,
      [workerId]
    );

    return result.rows.map(r => ({
      service_id: r.service_id || r.id,
      label: r.custom_label || r.service_label || 'Service',
      label_np: r.custom_label_np || r.service_label_np || null,
      worker_price: r.price,
      is_active: r.is_active,
      is_custom: Boolean(r.custom_label),
      profession_id: r.profession_id,
      profession: r.profession_name ? { name: r.profession_name } : null,
    }));
  }

  async _getStats(workerId) {
    const [bookingStats, reviewStats, performanceResult] = await Promise.all([
      // Booking stats
      pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'completed') AS completed_jobs,
          COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_jobs,
          COUNT(*) AS total_bookings
         FROM bookings
         WHERE worker_id = $1`,
        [workerId]
      ),
      // Review stats
      pool.query(
        `SELECT 
          AVG(rating)::numeric(10,1) AS average_rating,
          COUNT(*)::int AS review_count
         FROM reviews
         WHERE worker_id = $1`,
        [workerId]
      ),
      // Try to get performance data (Phase 14F)
      this._getPerformanceStats(workerId),
    ]);

    const bookings = bookingStats.rows[0] || {};
    const reviews = reviewStats.rows[0] || {};

    const totalRelevant = (parseInt(bookings.completed_jobs) || 0) + (parseInt(bookings.cancelled_jobs) || 0);

    return {
      completed_jobs: parseInt(bookings.completed_jobs) || 0,
      cancelled_jobs: parseInt(bookings.cancelled_jobs) || 0,
      total_bookings: parseInt(bookings.total_bookings) || 0,
      completion_rate: totalRelevant > 0 
        ? Math.round((parseInt(bookings.completed_jobs) / totalRelevant) * 100) 
        : 0,
      cancellation_rate: parseInt(bookings.total_bookings) > 0
        ? Math.round((parseInt(bookings.cancelled_jobs) / parseInt(bookings.total_bookings)) * 100)
        : 0,
      average_rating: parseFloat(reviews.average_rating) || 0,
      review_count: parseInt(reviews.review_count) || 0,
      trust_score: performanceResult?.trustScore || 0,
      reliability_label: performanceResult?.trustTier?.label || null,
      badges: performanceResult?.badges || [],
    };
  }

  async _getPerformanceStats(workerId) {
    try {
      const workerReliabilityScoringService = require('../../modules/performance/workerReliabilityScoring.service');
      const profile = await workerReliabilityScoringService.getReliabilityProfile(workerId);
      return {
        trustScore: profile.trustScore,
        trustTier: profile.trustTier,
        badges: profile.badges,
      };
    } catch (e) {
      // Performance service may not exist yet in all environments
      return { trustScore: 0, trustTier: null, badges: [] };
    }
  }
}

module.exports = new WorkerProfileResolver();