/**
 * Workers View Routes
 * Phase 15 — Unified Data Truth Layer
 * 
 * Exposes normalized, unified worker profiles.
 * All endpoints call WorkerProfileResolver — no direct DB queries.
 * Legacy worker routes remain untouched.
 */

const express = require('express');
const router = express.Router();
const workerProfileResolver = require('../../services/worker/workerProfileResolver.service');
const metricsEngine = require('../../services/integrity/metricsEngine.service');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');

/**
 * GET /api/workers/view/me
 * Worker views their own unified profile
 */
router.get(
  '/me',
  authGuard,
  async (req, res, next) => {
    try {
      const profile = await workerProfileResolver.getMyProfile(req.user.id);
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Worker profile not found',
        });
      }

      res.json({
        success: true,
        data: profile,
        meta: {
          source: 'unified',
          version: '15.0',
          resolvedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/workers/view/:id
 * Public/client view of a worker's unified profile
 */
router.get(
  '/:id',
  authGuard,
  async (req, res, next) => {
    try {
      const profile = await workerProfileResolver.getById(req.params.id);
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Worker not found',
        });
      }

      // Return full profile for authenticated users
      res.json({
        success: true,
        data: profile,
        meta: {
          source: 'unified',
          version: '15.0',
          resolvedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/workers/view/admin/:id
 * Admin view of any worker's unified profile
 */
router.get(
  '/admin/:id',
  authGuard,
  permissionGuard('view_analytics'),
  async (req, res, next) => {
    try {
      const profile = await workerProfileResolver.getById(req.params.id);
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Worker not found',
        });
      }

      res.json({
        success: true,
        data: profile,
        meta: {
          source: 'unified',
          version: '15.0',
          resolvedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/workers/view/me/dashboard
 * Worker's complete dashboard metrics (today, weekly, monthly, lifetime)
 */
router.get(
  '/me/dashboard',
  authGuard,
  async (req, res, next) => {
    try {
      const dashboard = await metricsEngine.computeDashboardMetrics(req.user.id);
      res.json({
        success: true,
        data: dashboard,
        meta: {
          source: 'metricsEngine',
          version: '16.1',
          computedAt: dashboard.computedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;