const router = require('express').Router();
const ctrl = require('./financialReporting.controller');

router.get('/trial-balance',     ctrl.trialBalance);
router.get('/profit-loss',       ctrl.profitLoss);
router.get('/balance-sheet',     ctrl.balanceSheet);
router.get('/cash-flow',         ctrl.cashFlow);
router.get('/worker-earnings',   ctrl.workerEarnings);
router.get('/platform-revenue',  ctrl.platformRevenue);

module.exports = router;