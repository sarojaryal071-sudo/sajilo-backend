const express = require('express');
const router = express.Router();
const analyticsController = require('./admin.analytics.controller');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');
const workerIntelligenceService = require('../performance/workerIntelligence.service');
const workerReliabilityScoringService = require('../performance/workerReliabilityScoring.service');

// Single endpoint: get all analytics
router.get(
  '/',
  authGuard,
  permissionGuard('view_analytics'),
  analyticsController.getAllAnalytics
);

// ─── Phase 14F: Worker Performance Intelligence ─────────────────

// GET /api/admin/analytics/performance/flagged
// Returns workers flagged by operational thresholds (with names)
router.get(
  '/performance/flagged',
  authGuard,
  permissionGuard('view_analytics'),
  async (req, res, next) => {
    try {
      const flagged = await workerIntelligenceService.getFlaggedWorkersWithNames();
      
      res.json({
        success: true,
        data: flagged,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/admin/analytics/performance/top-performers?limit=10
// Returns top performing workers (with names)
router.get(
  '/performance/top-performers',
  authGuard,
  permissionGuard('view_analytics'),
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const topPerformers = await workerIntelligenceService.getTopPerformersWithNames(limit);
      
      res.json({
        success: true,
        data: topPerformers,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/admin/analytics/performance/worker/:workerId
// Returns full reliability profile for a specific worker
router.get(
  '/performance/worker/:workerId',
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

module.exports = router;