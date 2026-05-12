// sajilo-backend/src/modules/admin/admin.featureFlags.controller.js
const { getAllFlags, FLAGS } = require('../../config/featureFlags.config');

/**
 * GET /api/admin/feature-flags
 * Returns the current state of all feature flags.
 */
async function getFeatureFlags(req, res) {
  try {
    const flags = getAllFlags();
    return res.json({ success: true, data: flags });
  } catch (err) {
    console.error('getFeatureFlags error:', err);
    return res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
}

/**
 * PUT /api/admin/feature-flags/:flagName
 * Toggle a specific feature flag on/off.
 * Body: { enabled: true/false }
 */
async function toggleFeatureFlag(req, res) {
  try {
    const { flagName } = req.params;
    const { enabled } = req.body;

    if (!FLAGS.hasOwnProperty(flagName)) {
      return res.status(404).json({ error: `Flag '${flagName}' not found` });
    }
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    // Update the in‑memory flag (and reflect in environment for persistence across restarts)
    FLAGS[flagName] = enabled;
    process.env[`FEATURE_${flagName}`] = enabled ? 'true' : 'false';

    return res.json({ success: true, data: { [flagName]: enabled } });
  } catch (err) {
    console.error('toggleFeatureFlag error:', err);
    return res.status(500).json({ error: 'Failed to update feature flag' });
  }
}

module.exports = { getFeatureFlags, toggleFeatureFlag };