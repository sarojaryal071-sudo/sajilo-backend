/**
 * Worker Intelligence Service
 * Phase 14F — Worker Performance & Quality Intelligence
 * 
 * Aggregation layer that computes metrics from real database columns only.
 * Schemas confirmed: bookings (18 cols), reviews (7 cols), payments (22 cols), users (25 cols).
 */

const { pool } = require('../../config/database');
const WORKER_PERFORMANCE_REGISTRY = require('../../config/workerPerformanceRegistry');

class WorkerIntelligenceService {
  async getWorkerMetrics(workerId) {
    const windows = WORKER_PERFORMANCE_REGISTRY.windows;

    const [
      completionStats,
      cancellationStats,
      acceptanceStats,
      reviewStats,
      responseStats,
      bookingVolume,
      earningsTotal,
      lastActivity,
    ] = await Promise.all([
      this._getCompletionRate(workerId),
      this._getCancellationRate(workerId),
      this._getAcceptanceRate(workerId),
      this._getReviewStats(workerId),
      this._getResponseSpeed(workerId, windows.responseTimeWindowDays),
      this._getBookingVolume(workerId, windows.bookingVolumeWindowDays),
      this._getEarningsTotal(workerId),
      this._getLastActivity(workerId),
    ]);

    return {
      workerId,
      completionRate: completionStats,
      cancellationRate: cancellationStats,
      acceptanceRate: acceptanceStats,
      reviewAverage: reviewStats.average,
      reviewCount: reviewStats.count,
      responseSpeed: responseStats,
      bookingVolume,
      earningsTotal,
      lastActivity,
      calculatedAt: new Date().toISOString(),
    };
  }

  async getBulkWorkerMetrics(workerIds) {
    if (!workerIds || workerIds.length === 0) return [];
    const metrics = await Promise.allSettled(workerIds.map(id => this.getWorkerMetrics(id)));
    return metrics.filter(r => r.status === 'fulfilled').map(r => r.value);
  }

  async getFlaggedWorkers() {
    const flags = WORKER_PERFORMANCE_REGISTRY.adminFlags;

    const workers = await pool.query(
      `SELECT id FROM users WHERE role = 'worker'`
    );
    const workerIds = workers.rows.map(w => w.id);

    const allMetrics = await this.getBulkWorkerMetrics(workerIds);

    const flagged = {
      highCancellation: [],
      lowCompletion: [],
      lowRated: [],
      inactive: [],
      criticalRisk: [],
    };

    for (const metrics of allMetrics) {
      if (metrics.cancellationRate.rate >= flags.highCancellation.threshold) {
        flagged.highCancellation.push(metrics);
      }
      if (metrics.completionRate.rate <= flags.lowCompletion.threshold && metrics.completionRate.total > 0) {
        flagged.lowCompletion.push(metrics);
      }
      if (metrics.reviewAverage <= flags.lowRated.threshold && metrics.reviewCount >= WORKER_PERFORMANCE_REGISTRY.rankingMinimums.minReviewCount) {
        flagged.lowRated.push(metrics);
      }
      if (metrics.lastActivity.daysSinceLastActivity !== null &&
          metrics.lastActivity.daysSinceLastActivity >= flags.inactive.daysSinceLastBooking) {
        flagged.inactive.push(metrics);
      }
    }

    return flagged;
  }

  async getTopPerformers(limit = 10) {
    const workers = await pool.query(`SELECT id FROM users WHERE role = 'worker'`);
    const workerIds = workers.rows.map(w => w.id);

    const allMetrics = await this.getBulkWorkerMetrics(workerIds);

    const eligible = allMetrics.filter(m =>
      m.bookingVolume.totalCompleted >= WORKER_PERFORMANCE_REGISTRY.rankingMinimums.minCompletedBookings
    );

    eligible.sort((a, b) => {
      const scoreA = (a.completionRate.rate * 0.6) + (a.reviewAverage * 0.4);
      const scoreB = (b.completionRate.rate * 0.6) + (b.reviewAverage * 0.4);
      return scoreB - scoreA;
    });

    return eligible.slice(0, limit);
  }

    /**
   * Get flagged workers with names resolved
   */
  async getFlaggedWorkersWithNames() {
    const flagged = await this.getFlaggedWorkers();
    
    const allIds = new Set();
    Object.values(flagged).forEach(list => list.forEach(w => allIds.add(w.workerId)));

    if (allIds.size === 0) return flagged;

    const result = await pool.query(
      `SELECT id, name, client_id FROM users WHERE id = ANY($1)`,
      [Array.from(allIds)]
    );
    const nameMap = {};
    const clientIdMap = {};
    result.rows.forEach(r => { 
      nameMap[r.id] = r.name;
      clientIdMap[r.id] = r.client_id;
    });

    const withNames = {};
    for (const [key, list] of Object.entries(flagged)) {
      withNames[key] = list.map(w => ({
        ...w,
        workerName: nameMap[w.workerId] || `Worker #${w.workerId}`,
        workerClientId: clientIdMap[w.workerId] || null,
      }));
    }
    return withNames;
  }

  /**
   * Get top performers with names resolved
   */
  async getTopPerformersWithNames(limit = 10) {
    const performers = await this.getTopPerformers(limit);
    
    const ids = performers.map(p => p.workerId);
    if (ids.length === 0) return performers;

    const result = await pool.query(
      `SELECT id, name, client_id FROM users WHERE id = ANY($1)`,
      [ids]
    );
    const nameMap = {};
    const clientIdMap = {};
    result.rows.forEach(r => { 
      nameMap[r.id] = r.name;
      clientIdMap[r.id] = r.client_id;
    });

    return performers.map(p => ({
      ...p,
      workerName: nameMap[p.workerId] || `Worker #${p.workerId}`,
      workerClientId: clientIdMap[p.workerId] || null,
    }));
  }

  // ─── PRIVATE METHODS (only real columns) ───

  async _getCompletionRate(workerId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled')) as total_relevant
      FROM bookings 
      WHERE worker_id = $1`,
      [workerId]
    );
    const { completed, total_relevant } = result.rows[0];
    const total = parseInt(total_relevant) || 0;
    const completedCount = parseInt(completed) || 0;
    return { completed: completedCount, total, rate: total > 0 ? Math.round((completedCount / total) * 100) : 0 };
  }

  async _getCancellationRate(workerId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) as total
      FROM bookings 
      WHERE worker_id = $1`,
      [workerId]
    );
    const { cancelled, total } = result.rows[0];
    const cancelledCount = parseInt(cancelled) || 0;
    const totalCount = parseInt(total) || 0;
    return { cancelled: cancelledCount, total: totalCount, rate: totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0 };
  }

  async _getAcceptanceRate(workerId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status IN ('accepted', 'onway', 'working', 'completed')) as accepted,
        COUNT(*) as total
      FROM bookings 
      WHERE worker_id = $1`,
      [workerId]
    );
    const { accepted, total } = result.rows[0];
    const acceptedCount = parseInt(accepted) || 0;
    const totalCount = parseInt(total) || 0;
    return { accepted: acceptedCount, total: totalCount, rate: totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0 };
  }

  async _getReviewStats(workerId) {
    const result = await pool.query(
      `SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as review_count
      FROM reviews 
      WHERE worker_id = $1`,
      [workerId]
    );
    const { average_rating, review_count } = result.rows[0];
    return {
      average: average_rating ? Math.round(parseFloat(average_rating) * 10) / 10 : 0,
      count: parseInt(review_count) || 0,
    };
  }

  async _getResponseSpeed(workerId, windowDays) {
    // Approximate response speed: time from created_at to updated_at
    // for bookings that were accepted (status changed from pending).
    const result = await pool.query(
      `SELECT 
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60) as avg_response_minutes
      FROM bookings
      WHERE worker_id = $1
        AND status IN ('accepted', 'onway', 'working', 'completed')
        AND created_at >= NOW() - INTERVAL '1 day' * $2`,
      [workerId, windowDays]
    );

    const avgMinutes = result.rows[0]?.avg_response_minutes
      ? Math.round(parseFloat(result.rows[0].avg_response_minutes))
      : null;

    return {
      averageMinutes: avgMinutes,
      label: this._getResponseLabel(avgMinutes),
    };
  }

  async _getBookingVolume(workerId, windowDays) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
        COUNT(*) as total_bookings
      FROM bookings 
      WHERE worker_id = $1 
        AND created_at >= NOW() - INTERVAL '1 day' * $2`,
      [workerId, windowDays]
    );
    const { completed_bookings, total_bookings } = result.rows[0];
    return {
      totalCompleted: parseInt(completed_bookings) || 0,
      totalBookings: parseInt(total_bookings) || 0,
      windowDays,
    };
  }

  async _getEarningsTotal(workerId) {
    const result = await pool.query(
      `SELECT COALESCE(SUM(final_total), 0) as total_earnings
      FROM payments 
      WHERE worker_id = $1 
        AND status = 'paid'`,
      [workerId]
    );
    return parseFloat(result.rows[0].total_earnings) || 0;
  }

  async _getLastActivity(workerId) {
    const result = await pool.query(
      `SELECT MAX(updated_at) as last_activity_date
      FROM bookings 
      WHERE worker_id = $1`,
      [workerId]
    );
    const lastDate = result.rows[0]?.last_activity_date;
    if (!lastDate) {
      return { lastActivityDate: null, daysSinceLastActivity: null };
    }
    const daysSince = Math.floor(
      (new Date() - new Date(lastDate)) / (1000 * 60 * 60 * 24)
    );
    return {
      lastActivityDate: lastDate.toISOString(),
      daysSinceLastActivity: daysSince,
    };
  }

  _getResponseLabel(averageMinutes) {
    if (averageMinutes === null) return null;
    const labels = WORKER_PERFORMANCE_REGISTRY.responseSpeedLabels;
    if (averageMinutes <= labels.fast.maxMinutes) return labels.fast;
    if (averageMinutes <= labels.moderate.maxMinutes) return labels.moderate;
    if (averageMinutes <= labels.slow.maxMinutes) return labels.slow;
    return labels.verySlow;
  }
}

module.exports = new WorkerIntelligenceService();