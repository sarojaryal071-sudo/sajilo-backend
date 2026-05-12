const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    deployedAt: process.env.DEPLOYED_AT || new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;