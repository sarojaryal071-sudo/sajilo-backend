// sajilo-backend/src/modules/admin/admin.deployment.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const { getIO } = require('../realtime/socket');
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');

// Critical tables that must exist after all migrations
const REQUIRED_TABLES = [
  'users', 'bookings', 'payments', 'reviews', 'conversations', 'messages',
  'moderation_actions', 'support_tickets', 'announcements',
  'system_activity_log', 'platform_policies',
];

router.get(
  '/',
  authGuard,
  roleGuard('admin'),
  async (req, res) => {
    try {
      // 1. Database table checks
      const missingTables = [];
      for (const table of REQUIRED_TABLES) {
        const result = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
          ) AS exists`,
          [table]
        );
        if (!result.rows[0]?.exists) {
          missingTables.push(table);
        }
      }

      // 2. Socket health
      const io = getIO();
      const socketAlive = !!io;   // true if io instance exists

      // 3. Version comparison
      const frontendVersion = req.query.frontendVersion || null;
      const backendVersion = process.env.npm_package_version || '1.0.0';
      let versionMismatch = false;
      if (frontendVersion && frontendVersion !== backendVersion) {
        versionMismatch = true;
      }

      // 4. Uptime
      const uptime = process.uptime();

      // 5. Warnings
      const warnings = [];
      if (missingTables.length > 0) {
        warnings.push(`Missing tables: ${missingTables.join(', ')}`);
      }
      if (!socketAlive) {
        warnings.push('Socket.io server not reachable');
      }
      if (versionMismatch) {
        warnings.push(`Version mismatch – frontend: ${frontendVersion}, backend: ${backendVersion}`);
      }

      return res.json({
        success: true,
        data: {
          missingTables,
          socketAlive,
          frontendVersion,
          backendVersion,
          versionMismatch,
          uptime,
          warnings,
          environment: process.env.NODE_ENV || 'development',
          deploymentTimestamp: process.env.DEPLOYED_AT || new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('deployment-status error:', err);
      return res.status(500).json({ error: 'Failed to fetch deployment status' });
    }
  }
);

module.exports = router;