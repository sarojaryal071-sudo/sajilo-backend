const { pool } = require('../../config/database');
const deploymentConfig = require('../../config/deployment.config');

async function getAppConfig() {
  let brandName = 'Sewa Bazar';
  let brandLogoUrl = null;

  try {
    const result = await pool.query(
      `SELECT config_json FROM ui_configurations WHERE scope = 'global' AND status = 'published' LIMIT 1`
    );
    if (result.rows.length > 0) {
      const branding = result.rows[0].config_json?.branding || {};
      if (branding.appName) brandName = branding.appName;
      if (branding.logos?.primary) brandLogoUrl = branding.logos.primary;
    }
  } catch (err) {
    // use fallback values
  }

  return {
    brandName,
    brandLogoUrl,
    developer: `${brandName} Team`,
    version: deploymentConfig.app?.version || '1.0.0',
    build: deploymentConfig.app?.build || '100',
    release: deploymentConfig.app?.release || 'Production',
  };
}

module.exports = { getAppConfig };