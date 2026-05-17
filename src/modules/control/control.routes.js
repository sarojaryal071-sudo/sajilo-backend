const router = require('express').Router();
const anomalyEngine = require('./anomalyEngine');
const alertEngine = require('./alertEngine');
const dashboardService = require('./controlDashboardService');
const riskEngine = require('./riskEngine');


// Anomalies (raw detection)
router.get('/anomalies', async (req, res) => {
  try {
    const data = await anomalyEngine.detectAnomalies();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ANOMALY ENGINE] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Alerts (generated + acknowledged)
router.get('/alerts', async (req, res) => {
  try {
    // Generate any new alerts from current anomalies
    await alertEngine.generateAlerts();
    const status = req.query.status || null;
    const alerts = await alertEngine.listAlerts(status);
    res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('[ALERT ENGINE] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/alerts/acknowledge/:id', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const alert = await alertEngine.acknowledgeAlert(req.params.id, userId);
    if (!alert) return res.status(404).json({ success: false, message: 'Active alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    console.error('[ALERT ACK] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const data = await dashboardService.getDashboardData();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[CONTROL DASHBOARD] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/risk-score', async (req, res) => {
  try {
    const data = await riskEngine.getRiskScore();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[RISK SCORE] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;