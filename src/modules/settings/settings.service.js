// sajilo-backend/src/modules/settings/settings.service.js
const settingsModel = require('./settings.model');
const authModel = require('../auth/auth.model');
const { extractSyncValues } = require('./utils/extractSyncValues');
const { IDENTITY_SYNC_FIELDS } = require('./utils/identitySyncMap');
const { pool } = require('../../config/database');
const { diffSettings } = require('./utils/diffSettings');
const { logSettingsChange } = require('./settings.audit.service');
const { SETTINGS_EVENTS } = require('./settings.events');

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

async function getUserSettings(userId) {
  const row = await settingsModel.getOrCreate(userId);
  return row.settings;
}

async function updateUserSettings(userId, partial, reqInfo = {}) {
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
    // Audit password change (no values)
    await logSettingsChange({
      userId,
      section: 'security',
      fieldPath: 'password',
      actionType: SETTINGS_EVENTS.PASSWORD_CHANGED,
      ipAddress: reqInfo.ip,
      userAgent: reqInfo.userAgent,
    });
    delete partial.security.currentPassword;
    delete partial.security.newPassword;
    delete partial.security.confirmPassword;
    if (Object.keys(partial.security).length === 0) delete partial.security;
  }

  // Handle dangerous actions (deactivate/delete account) – also audit
  if (partial.security && (partial.security.deactivateAccount || partial.security.deleteAccount)) {
    const action = partial.security.deactivateAccount ? SETTINGS_EVENTS.ACCOUNT_DEACTIVATED : SETTINGS_EVENTS.ACCOUNT_DELETED_REQUESTED;
    await logSettingsChange({
      userId,
      section: 'security',
      fieldPath: partial.security.deactivateAccount ? 'deactivateAccount' : 'deleteAccount',
      actionType: action,
      ipAddress: reqInfo.ip,
      userAgent: reqInfo.userAgent,
    });
  }

  // Filter allowed sections
  const allowedUpdates = {};
  for (const key of settingsModel.ALLOWED_SECTIONS) {
    if (partial.hasOwnProperty(key)) allowedUpdates[key] = partial[key];
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentRow = await settingsModel.getOrCreate(userId, client);
    const oldSettings = currentRow.settings;
    const merged = deepMerge(oldSettings, allowedUpdates);
    const updatedRow = await settingsModel.update(userId, merged, client);

    // Sync identity if needed
    const syncValues = extractSyncValues(merged);
    if (Object.keys(syncValues).length > 0) {
      if (syncValues.email) {
        const existing = await authModel.findByEmail(syncValues.email);
        if (existing && existing.id !== userId) throw new Error('Email already in use');
      }
      const currentUser = await authModel.findById(userId);
      const changes = {};
      for (const [col, val] of Object.entries(syncValues)) {
        if (currentUser && currentUser[col] !== val) changes[col] = val;
      }
      if (Object.keys(changes).length > 0) {
        await authModel.updateUserIdentity(userId, changes);
        console.log('[SettingsSync] Synced identity for user', userId, Object.keys(changes).join(','));
      }
    }

    // Audit: diff and log changed fields
    const diffs = diffSettings(oldSettings, merged);
    for (const diff of diffs) {
      const section = diff.path.split('.')[0] || '';
      await logSettingsChange({
        userId,
        section,
        fieldPath: diff.path,
        oldValue: diff.oldValue,
        newValue: diff.newValue,
        actionType: SETTINGS_EVENTS.SETTINGS_UPDATED,
        ipAddress: reqInfo.ip,
        userAgent: reqInfo.userAgent,
      });
    }

    await client.query('COMMIT');
    return updatedRow.settings;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[SettingsSync] Failed syncing for user', userId, err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function resetUserSettings(userId) {
  const defaults = { ...settingsModel.DEFAULT_SETTINGS };
  await settingsModel.update(userId, defaults);
  return defaults;
}

module.exports = { getUserSettings, updateUserSettings, resetUserSettings };