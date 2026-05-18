// sajilo-backend/src/modules/settings/utils/extractSyncValues.js
const { IDENTITY_SYNC_FIELDS } = require('./identitySyncMap');

/**
 * Extract the identity fields that should be synced to the users table.
 * @param {Object} mergedSettings - the final (merged) settings object
 * @returns {Object} - flat object with users column names as keys and their new values
 *   e.g. { name: 'John', email: 'john@test.com', phone: '123' }
 */
function extractSyncValues(mergedSettings) {
  const syncValues = {};
  for (const [dotPath, columnName] of Object.entries(IDENTITY_SYNC_FIELDS)) {
    const value = dotPath.split('.').reduce((obj, key) => obj?.[key], mergedSettings);
    if (value !== undefined && value !== null) {
      // Normalise phone: trim whitespace only
      if (columnName === 'phone') {
        syncValues[columnName] = value.trim();
      } else if (columnName === 'email') {
        syncValues[columnName] = value.trim().toLowerCase();
      } else {
        syncValues[columnName] = value;
      }
    }
  }
  return syncValues;
}

module.exports = { extractSyncValues };