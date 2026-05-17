// sajilo-backend/src/modules/accounting/accountingAdmin.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('./manualJournal.controller');
const reconCtrl = require('./accountingReconciliation.controller');
const backfillCtrl = require('./accountingBackfill.controller');
const integrityCtrl = require('./accountingIntegrity.controller');
const reconEngine = require('./reconciliationEngine');
const pnlValidator = require('./pnlReconciliationValidator');
const cashFlowEngine = require('./cashFlowTraceEngine');
const auditTraceService = require('./auditTraceService');
const healthService = require('./financialHealthService');
const anomalyEngine = require('../control/anomalyEngine');


// All routes require admin role
router.post('/journal', ctrl.createManualEntry);
router.get('/journal', ctrl.listManualEntries);
router.get('/journal/:id', ctrl.getManualEntryById);
router.get('/reconciliation/report', reconCtrl.getReconciliationReport);
router.post('/backfill/run', backfillCtrl.runBackfill);
router.get('/backfill/status', backfillCtrl.getBackfillStatus);
router.get('/integrity/source-report', integrityCtrl.sourceReport);

router.get('/reconciliation/ledger-vs-accounting', async (req, res) => {
  try {
    const data = await reconEngine.reconcileLedgerVsAccounting();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[RECONCILIATION] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/pnl-reconciliation', async (req, res) => {
  try {
    const data = await pnlValidator.validateProfitLoss();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[PNL RECONCILIATION] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/cash-flow-trace', async (req, res) => {
  try {
    const data = await cashFlowEngine.getCashFlowTrace();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[CASH FLOW TRACE] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/audit-trace/:id', async (req, res) => {
  try {
    const trace = await auditTraceService.getAuditTrace(req.params.id);
    if (!trace) return res.status(404).json({ success: false, message: 'Accounting entry not found' });
    res.json({ success: true, data: trace });
  } catch (err) {
    console.error('[AUDIT TRACE] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/health', async (req, res) => {
  try {
    const data = await healthService.getFinancialHealth();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[FINANCIAL HEALTH] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/control/anomalies', async (req, res) => {
  try {
    const data = await anomalyEngine.detectAnomalies();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ANOMALY ENGINE] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;