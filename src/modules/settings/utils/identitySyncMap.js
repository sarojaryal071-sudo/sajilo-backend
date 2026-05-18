// sajilo-backend/src/modules/settings/utils/identitySyncMap.js
// Maps dot-notation settings paths to users table column names.
// Only these fields will be synchronised automatically.

const IDENTITY_SYNC_FIELDS = {
  'account.fullName': 'name',   // users table uses "name" (see auth.model findById)
  'account.email': 'email',
  'account.phone': 'phone',
};

module.exports = { IDENTITY_SYNC_FIELDS };