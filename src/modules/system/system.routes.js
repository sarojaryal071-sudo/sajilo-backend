const express = require('express');
const automationRegistry = require('../../config/automationRegistry');
const schedulerService = require('../../services/scheduler/scheduler.service');

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    status: 'ok',

    version: process.env.npm_package_version || '1.0.0',

    environment: process.env.NODE_ENV || 'development',

    deployedAt:
      process.env.DEPLOYED_AT || new Date().toISOString(),

    uptime: process.uptime(),

    automation: {
      totalRegistered: Object.keys(automationRegistry).length,

      enabledJobs: Object.values(automationRegistry).filter(
        (job) => job.enabled !== false
      ).length,

      jobs: Object.values(automationRegistry).map((job) => ({
        key: job.key,
        enabled: job.enabled !== false,
        interval: job.interval,
        description: job.description || null,
      })),

      scheduler: {
        running:
          typeof schedulerService.isRunning === 'function'
            ? schedulerService.isRunning()
            : true,
      },
    },
  });
});

module.exports = router;