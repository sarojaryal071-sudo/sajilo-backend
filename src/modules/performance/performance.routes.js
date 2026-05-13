/**
 * Performance Routes
 * Phase 14F — Worker Performance & Quality Intelligence
 * 
 * Exposes worker performance metrics via REST API.
 * Read-only endpoints — no mutations.
 */

const express = require('express');
const router = express.Router();
const workerIntelligenceService = require('./workerIntelligence.service');
const workerReliabilityScoringService = require('./workerReliabilityScoring.service');

// Middleware imports (existing)
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');

// ─── WORKER: Own Performance ────────────────────────────────────

/**
 * GET /api/performance/worker/me
 * Worker views their own reliability profile
 */
router.get(
  '/worker/me',
  authGuard,
  async (req, res, next) => {
    try {
      const profile = await workerReliabilityScoringService.getReliabilityProfile(req.user.id);
      
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/performance/worker/me/metrics
 * Worker views their raw metrics only
 */
router.get(
  '/worker/me/metrics',
  authGuard,
  async (req, res, next) => {
    try {
      const metrics = await workerIntelligenceService.getWorkerMetrics(req.user.id);
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── CLIENT: Worker Public Profile ──────────────────────────────

/**
 * GET /api/performance/worker/:workerId/public
 * Client views public trust indicators for a worker
 */
router.get(
  '/worker/:workerId/public',
  authGuard,
  async (req, res, next) => {
    try {
      const { workerId } = req.params;
      
      const profile = await workerReliabilityScoringService.getReliabilityProfile(workerId);
      
      // Return limited public-facing data
      res.json({
        success: true,
        data: {
          trustScore: profile.trustScore,
          trustTier: profile.trustTier,
          badges: profile.badges,
          responseSpeedDisplay: profile.responseSpeedDisplay,
          metrics: {
            completionRate: profile.metrics.completionRate,
            reviewAverage: profile.metrics.reviewAverage,
            reviewCount: profile.metrics.reviewCount,
            totalCompletedBookings: profile.metrics.totalCompletedBookings,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── ADMIN: Operational Intelligence ────────────────────────────

/**
 * GET /api/performance/admin/flagged
 * Admin views workers flagged by operational thresholds
 */
router.get(
  '/admin/flagged',
  authGuard,
  permissionGuard('view_analytics'),
  async (req, res, next) => {
    try {
      const flagged = await workerIntelligenceService.getFlaggedWorkers();
      
      res.json({
        success: true,
        data: flagged,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/performance/admin/top-performers
 * Admin views top performing workers
 */
router.get(
  '/admin/top-performers',
  authGuard,
  permissionGuard('view_analytics'),
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const topPerformers = await workerIntelligenceService.getTopPerformers(limit);
      
      res.json({
        success: true,
        data: topPerformers,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/performance/admin/worker/:workerId
 * Admin views full reliability profile for any worker
 */
router.get(
  '/admin/worker/:workerId',
  authGuard,
  permissionGuard('view_analytics'),
  async (req, res, next) => {
    try {
      const { workerId } = req.params;
      const profile = await workerReliabilityScoringService.getReliabilityProfile(workerId);
      
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/performance/admin/workers/bulk
 * Admin queries multiple workers at once
 * Query: ?ids=id1,id2,id3
 */
router.get(
  '/admin/workers/bulk',
  authGuard,
  permissionGuard('view_analytics'),
  async (req, res, next) => {
    try {
      const idsParam = req.query.ids;
      
      if (!idsParam) {
        return res.status(400).json({
          success: false,
          message: 'Query parameter "ids" is required (comma-separated)',
        });
      }

      const workerIds = idsParam.split(',').map(id => id.trim()).filter(Boolean);
      const profiles = await workerReliabilityScoringService.getBulkReliabilityProfiles(workerIds);
      
      res.json({
        success: true,
        data: profiles,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;