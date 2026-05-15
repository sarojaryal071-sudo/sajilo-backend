const ledgerService = require('./ledger.service');
const financialAggregation = require('./financialAggregation.service');
const paymentAnalytics = require('../admin/paymentAnalytics.service');

async function getFinancialOverview(req, res, next) {
  try {
    const overview = await financialAggregation.getFinancialOverview();
    res.json({ success: true, data: overview });
  } catch (err) { next(err); }
}

async function getWorkerDueList(req, res, next) {
  try {
    const list = await financialAggregation.getWorkerDueList();
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
}

async function getOverview(req, res, next) {
  try {
    const overview = await ledgerService.getOverview();
    res.json({ success: true, data: overview });
  } catch (err) { next(err); }
}

async function getWorkerCommission(req, res, next) {
  try {
    const due = await ledgerService.getCommissionDue(parseInt(req.params.workerId));
    res.json({ success: true, data: due });
  } catch (err) { next(err); }
}

async function getWorkerLedger(req, res, next) {
  try {
    const entries = await ledgerService.getWorkerLedger(parseInt(req.params.workerId));
    res.json({ success: true, data: entries });
  } catch (err) { next(err); }
}

async function getTimeline(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const events = await ledgerService.getLedgerTimeline(limit);
    res.json({ success: true, data: events });
  } catch (err) { next(err); }
}

async function recordSettlement(req, res, next) {
  try {
    const { workerId, amount, method, note } = req.body;
    if (!workerId || !amount) {
      return res.status(400).json({ success: false, message: 'workerId and amount are required' });
    }
    const entry = await ledgerService.createEntry({
      worker_id: workerId,
      event_type: 'settlement_recorded',
      amount: parseFloat(amount),
      metadata: {
        method: method || 'cash',
        note: note || '',
        recorded_by_admin: req.user.id,
        recorded_at: new Date().toISOString(),
      },
      created_by_role: 'admin',
      created_by_user: req.user.id,
    });
    res.json({ success: true, data: entry, message: 'Settlement recorded' });
  } catch (err) { next(err); }
}

// ── New Payment Analytics Handlers ──

async function getProviderBreakdown(req, res, next) {
  try { res.json({ success: true, data: await paymentAnalytics.getProviderBreakdown() }); }
  catch (err) { next(err); }
}

async function getOperationalMetrics(req, res, next) {
  try { res.json({ success: true, data: await paymentAnalytics.getOperationalMetrics() }); }
  catch (err) { next(err); }
}

async function getWorkerReliability(req, res, next) {
  try { res.json({ success: true, data: await paymentAnalytics.getWorkerPaymentReliability() }); }
  catch (err) { next(err); }
}

async function getSettlementSpeed(req, res, next) {
  try { res.json({ success: true, data: await paymentAnalytics.getSettlementSpeed() }); }
  catch (err) { next(err); }
}

module.exports = {
  getOverview,
  getWorkerCommission,
  getWorkerLedger,
  getFinancialOverview,
  getWorkerDueList,
  getTimeline,
  recordSettlement,
  getProviderBreakdown,
  getOperationalMetrics,
  getWorkerReliability,
  getSettlementSpeed,
};