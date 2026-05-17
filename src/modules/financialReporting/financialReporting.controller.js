const trialBalanceService = require('./trialBalanceService');
const profitLossService = require('./profitLossService');
const balanceSheetService = require('./balanceSheetService');
const cashFlowService = require('./cashFlowService');
const workerEarningsService = require('./workerEarningsService');
const platformRevenueService = require('./platformRevenueService');

function ensureAdmin(req, res) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return false;
  }
  return true;
}

function getPeriod(req) {
  return {
    from: req.query.from || null,
    to: req.query.to || null,
    asOf: req.query.asOf || null,
  };
}

module.exports = {
  async trialBalance(req, res) {
    try {
      const data = await trialBalanceService.getTrialBalance(getPeriod(req));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
  async profitLoss(req, res) {
    try {
      const data = await profitLossService.getProfitLoss(getPeriod(req));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
  async balanceSheet(req, res) {
    try {
      const data = await balanceSheetService.getBalanceSheet({
        asOf: req.query.asOf || new Date().toISOString(),
      });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
  async cashFlow(req, res) {
    try {
      const data = await cashFlowService.getCashFlow({
        from: req.query.from,
        to: req.query.to || new Date().toISOString(),
      });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
  async workerEarnings(req, res) {
    try {
      const data = await workerEarningsService.getWorkerEarnings(getPeriod(req));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
  async platformRevenue(req, res) {
    try {
      const data = await platformRevenueService.getPlatformRevenue(getPeriod(req));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
};