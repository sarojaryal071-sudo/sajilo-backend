// sajilo-backend/src/config/platformConfig.js
// Phase 12E – Platform Configuration Engine
// Centralised design tokens and UI configuration values.
// These are defaults; may be overridden via admin settings or feature flags.

const PLATFORM_CONFIG = {
  // ── Spacing Scale (in px) ─────────────────────────
  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  },

  // ── Border Radius Scale (in px) ───────────────────
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  // ── Density Mode ──────────────────────────────────
  // 'comfortable' | 'compact' | 'spacious'
  density: 'comfortable',

  // ── Typography Scale (font sizes in px) ───────────
  typography: {
    caption: 10,
    bodySm:  12,
    body:    14,
    title:   16,
    large:   20,
    xlarge:  24,
  },

  // ── Visibility Toggles (global UI sections) ────────
  visibility: {
    showWalletBalance:   false,
    showLiveTracking:    false,
    showRewardsWidget:   false,
    showSubscriptionCTA: false,
  },
};

// Getter for a single configuration value (dot-notation supported)
function getConfig(path, fallback = undefined) {
  const keys = path.split('.');
  let value = PLATFORM_CONFIG;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return fallback;
    }
  }
  return value;
}

module.exports = {
  PLATFORM_CONFIG,
  getConfig,
};