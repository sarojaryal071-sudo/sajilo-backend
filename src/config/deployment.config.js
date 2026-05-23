const deploymentConfig = {
  app: {
    version: process.env.APP_VERSION || "1.0.0",
    build: process.env.APP_BUILD || "100",
    release: process.env.APP_RELEASE || "Production",
  },
};

module.exports = deploymentConfig;