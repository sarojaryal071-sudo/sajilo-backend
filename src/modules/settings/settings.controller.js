const settingsService = require('./settings.service');

async function getSettings(req, res) {
  try {
    const settings = await settingsService.getUserSettings(req.user.id);
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('getSettings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

async function updateSettings(req, res) {
  try {
    const updates = req.body;
    const reqInfo = {
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
    };
    const settings = await settingsService.updateUserSettings(req.user.id, updates, reqInfo);
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('updateSettings error:', err);
    res.status(400).json({ error: err.message || 'Failed to update settings' });
  }
}

async function getAuditLogs(req, res) {
  try {
    const userId = req.user.id;
    const { pool } = require('../../config/database');
    const { rows } = await pool.query(
      `SELECT section, field_path, action_type, created_at
       FROM settings_audit_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getAuditLogs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}

module.exports = { getSettings, updateSettings, getAuditLogs };