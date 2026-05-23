const appConfigService = require('./appConfig.service');

async function getAppConfig(req, res) {
  try {
    const config = await appConfigService.getAppConfig();
    return res.json({ success: true, data: config });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load app config' });
  }
}

module.exports = { getAppConfig };