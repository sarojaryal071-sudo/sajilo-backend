/**
 * Integrity Routes
 * Phase 16 — Single Source of Truth Architecture
 * 
 * Admin-only endpoints for metrics computation and reconciliation.
 * All read-only. No mutations.
 */

const express = require('express');
const router = express.Router();
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');
const metricsEngine = require('../../services/integrity/metricsEngine.service');
const reconciliationEngine = require('../../services/integrity/reconciliation.service');

/**
 * GET /api/integrity/worker/:id
 * Compute authoritative metrics for a single worker
 */
router.get(
  '/worker/:id',
  authGuard,
  permissionGuard('view_analytics'),
  async (req, res, next) => {
    try {
      const metrics = await metricsEngine.computeWorkerMetrics(req.params.id);
      res.json({
        success: true,
        data: metrics,
        meta: {
          source: 'metricsEngine',
          version: '16.0',
          computedAt: metrics.computedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/integrity/worker/:id/reconcile
 * Run reconciliation checks for a single worker
 */
router.get(
  '/worker/:id/reconcile',
  authGuard,
  permissionGuard('view_analytics'),
  async (req, res, next) => {
    try {
      const report = await reconciliationEngine.reconcileWorker(req.params.id);
      res.json({
        success: true,
        data: report,
        meta: {
          source: 'reconciliationEngine',
          version: '16.0',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/integrity/report
 * System-wide reconciliation report
 */
router.get(
  '/report',
  authGuard,
  permissionGuard('view_analytics'),
  async (req, res, next) => {
    try {
      const report = await reconciliationEngine.reconcileSystem();
      res.json({
        success: true,
        data: report,
        meta: {
          source: 'reconciliationEngine',
          version: '16.0',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/integrity/recompute/:id
 * Force recompute worker metrics (same as GET, explicit action)
 */
router.post(
  '/recompute/:id',
  authGuard,
  permissionGuard('view_analytics'),
  async (req, res, next) => {
    try {
      const metrics = await metricsEngine.computeWorkerMetrics(req.params.id);
      res.json({
        success: true,
        data: metrics,
        message: 'Metrics recomputed from source tables',
        meta: {
          source: 'metricsEngine',
          version: '16.0',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;