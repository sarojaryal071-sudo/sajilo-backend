const express = require('express');
const router = express.Router();
const controller = require('./ledger.controller');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');

router.get('/overview', authGuard, permissionGuard('view_analytics'), controller.getOverview);
router.get('/worker/:workerId/commission', authGuard, permissionGuard('view_analytics'), controller.getWorkerCommission);
router.get('/worker/:workerId', authGuard, permissionGuard('view_analytics'), controller.getWorkerLedger);
router.get('/financial/overview', authGuard, permissionGuard('view_analytics'), controller.getFinancialOverview);
router.get('/financial/worker-dues', authGuard, permissionGuard('view_analytics'), controller.getWorkerDueList);
router.get('/timeline', authGuard, permissionGuard('view_analytics'), controller.getTimeline);
router.post('/settle', authGuard, permissionGuard('view_analytics'), controller.recordSettlement);

module.exports = router;