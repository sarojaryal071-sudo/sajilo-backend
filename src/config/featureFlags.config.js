// sajilo-backend/src/config/featureFlags.config.js
// Phase 12D – Feature Flag System
// Centralised runtime feature toggles with safe defaults.
// Values can be overridden via environment variables or admin API (future).

const FLAGS = {
  // ── Wallet & Payments ────────────────────────────
  WALLETS_ENABLED:         false,   // eSewa / Khalti integration
  REWARDS_ENABLED:         false,   // loyalty points / cashback

  // ── Tracking & Logistics ─────────────────────────
  LIVE_TRACKING_ENABLED:   false,   // real‑time worker GPS tracking

  // ── Subscriptions ────────────────────────────────
  SUBSCRIPTIONS_ENABLED:   false,   // recurring plans for clients
};

/**
 * Get the current value of a feature flag.
 * Falls back to the default if the flag is not defined or overridden.
 * @param {string} flagName - key from FLAGS
 * @returns {boolean}
 */
function isFeatureEnabled(flagName) {
  const envVar = process.env[`FEATURE_${flagName}`];
  if (envVar !== undefined) {
    return envVar === 'true' || envVar === '1';
  }
  return FLAGS[flagName] ?? false;
}

/**
 * Get all flags with their current effective values.
 * @returns {object}
 */
function getAllFlags() {
  const result = {};
  for (const key of Object.keys(FLAGS)) {
    result[key] = isFeatureEnabled(key);
  }
  return result;
}

module.exports = {
  FLAGS,            // raw defaults (for reference)
  isFeatureEnabled,
  getAllFlags,
};