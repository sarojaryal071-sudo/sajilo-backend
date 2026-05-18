const settingsService = require('./settings.service');

/**
 * GET /api/settings
 */
async function getSettings(req, res) {
  try {
    const settings = await settingsService.getUserSettings(req.user.id);
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('getSettings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

/**
 * PATCH /api/settings
 */
async function updateSettings(req, res) {
  try {
    const updates = req.body;
    const settings = await settingsService.updateUserSettings(req.user.id, updates);
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('updateSettings error:', err);
    res.status(400).json({ error: err.message || 'Failed to update settings' });
  }
}

module.exports = { getSettings, updateSettings };