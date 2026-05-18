// sajilo-backend/src/modules/app-config/appConfig.controller.js
const deploymentConfig = require('../../config/deployment.config');

async function getAppConfig(req, res) {
  return res.json({ success: true, data: deploymentConfig });
}

module.exports = { getAppConfig };