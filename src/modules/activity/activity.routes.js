// sajilo-backend/src/modules/activity/activity.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');

/**
 * GET /api/admin/activity?type=booking&limit=30
 * Returns activity logs, newest first. Admin only.
 */
router.get(
  '/',
  authGuard,
  roleGuard('admin'),
  async (req, res) => {
    try {
      const { type, limit } = req.query;
      const maxLimit = Math.min(parseInt(limit, 10) || 50, 100); // default 50, max 100

      let query = 'SELECT * FROM system_activity_log';
      const params = [];

      if (type && typeof type === 'string') {
        query += ' WHERE type = $1';
        params.push(type);
      }

      query += ' ORDER BY created_at DESC';
      query += ` LIMIT $${params.length + 1}`;
      params.push(maxLimit);

      const result = await pool.query(query, params);
      return res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('getActivity error:', err);
      return res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
  }
);

module.exports = router;