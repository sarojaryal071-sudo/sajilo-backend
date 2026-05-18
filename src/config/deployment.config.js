// sajilo-backend/src/config/deployment.config.js
const deploymentConfig = {
  app: {
    name: "Sajilo",
    version: process.env.APP_VERSION || "1.0.0",
    build: process.env.APP_BUILD || "100",
    release: process.env.APP_RELEASE || "Production",
    developer: "Sajilo Team",
  },
};

module.exports = deploymentConfig;