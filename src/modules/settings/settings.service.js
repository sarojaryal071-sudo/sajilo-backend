const settingsModel = require('./settings.model');
const authModel = require('../auth/auth.model');

// Simple deep merge (arrays are replaced)
function deepMerge(a, b) {
  const result = { ...a };
  for (const key of Object.keys(b)) {
    if (
      b[key] &&
      typeof b[key] === 'object' &&
      !Array.isArray(b[key]) &&
      a[key] &&
      typeof a[key] === 'object' &&
      !Array.isArray(a[key])
    ) {
      result[key] = deepMerge(a[key], b[key]);
    } else {
      result[key] = b[key];
    }
  }
  return result;
}

/**
 * Get settings for a user. Auto‑creates defaults if missing.
 */
async function getUserSettings(userId) {
  const row = await settingsModel.getOrCreate(userId);
  return row.settings;
}

/**
 * Partially update settings. Only allowed sections are accepted.
 */
async function updateUserSettings(userId, partial) {
  if (!partial || typeof partial !== 'object') {
    throw new Error('Invalid update payload');
  }

  // Password change special handling
  if (partial.security && (partial.security.currentPassword || partial.security.newPassword)) {
    const { currentPassword, newPassword, confirmPassword } = partial.security;
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error('All password fields are required');
    }
    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    await authModel.changePassword(userId, currentPassword, newPassword);
    // Remove password fields so they don't get stored in JSON
    delete partial.security.currentPassword;
    delete partial.security.newPassword;
    delete partial.security.confirmPassword;
    if (Object.keys(partial.security).length === 0) {
      delete partial.security;
    }
  }

  // Filter out sections that are not in the allowed list
  const allowedUpdates = {};
  for (const key of settingsModel.ALLOWED_SECTIONS) {
    if (partial.hasOwnProperty(key)) {
      allowedUpdates[key] = partial[key];
    }
  }

  const currentRow = await settingsModel.getOrCreate(userId);
  const currentSettings = currentRow.settings;
  const merged = deepMerge(currentSettings, allowedUpdates);

  const updatedRow = await settingsModel.update(userId, merged);
  return updatedRow.settings;
}

/**
 * Reset settings to defaults.
 */
async function resetUserSettings(userId) {
  const defaults = { ...settingsModel.DEFAULT_SETTINGS };
  await settingsModel.update(userId, defaults);
  return defaults;
}

module.exports = { getUserSettings, updateUserSettings, resetUserSettings };