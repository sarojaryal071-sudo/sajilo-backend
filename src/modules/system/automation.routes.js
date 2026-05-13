// sajilo-backend/src/modules/system/automation.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const { AUTOMATION_JOBS } = require('../../config/automationRegistry');
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');

router.get(
  '/health',
  authGuard,
  roleGuard('admin'),
  async (req, res) => {
    try {
      const health = [];

      for (const [key, config] of Object.entries(AUTOMATION_JOBS)) {
        // Fetch the most recent execution for this key
        const logResult = await pool.query(
          `SELECT status, finished_at, error_message
           FROM automation_logs
           WHERE automation_key = $1
           ORDER BY finished_at DESC
           LIMIT 1`,
          [config.id]
        );

        const lastRun = logResult.rows[0] || null;

        health.push({
          id: config.id,
          description: config.description,
          enabled: config.enabled,
          intervalMs: config.intervalMs,
          lastRun: lastRun
            ? {
                status: lastRun.status,
                finishedAt: lastRun.finished_at,
                error: lastRun.error_message || null,
              }
            : null,
        });
      }

      return res.json({ success: true, data: health });
    } catch (err) {
      console.error('automation health error:', err);
      return res.status(500).json({ error: 'Failed to fetch automation health' });
    }
  }
);

module.exports = router;