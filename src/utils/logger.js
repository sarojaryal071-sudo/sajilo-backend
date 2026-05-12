// sajilo-backend/src/utils/logger.js
// Centralized logger for production error monitoring.
// Captures uncaught exceptions and unhandled rejections automatically.
// Use logger.info/warn/error instead of raw console calls for important events.

const logger = {
  info: (...args) => {
    console.log(`[INFO] ${new Date().toISOString()}`, ...args);
  },
  warn: (...args) => {
    console.warn(`[WARN] ${new Date().toISOString()}`, ...args);
  },
  error: (...args) => {
    console.error(`[ERROR] ${new Date().toISOString()}`, ...args);
  },
};

// ── Global error capture ──────────────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.message, err.stack);
  // Exit the process to avoid undefined state – typical Node best practice
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Do not exit immediately, but the error is prominently logged.
});

module.exports = logger;