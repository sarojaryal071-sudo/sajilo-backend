// sajilo-backend/src/modules/settings/settings.model.js
const { pool } = require('../../config/database');

const DEFAULT_SETTINGS = {
  account: {
    fullName: '',
    email: '',
    phone: '',
  },
  payment: {
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    walletPreference: 'cash',
  },
  bookingPreferences: {
    bookingHistoryVisibilityDays: 90,
    autoHideCompletedBookings: false,
  },
  security: {
    deactivateAccount: false,
    deleteAccount: false,
  },
  notification: {
    emailNotifications: false,
    pushNotifications: false,
    smsNotifications: false,
  },
  legal: {
    privacyPolicy: '',
    terms: '',
  },
};

const ALLOWED_SECTIONS = Object.keys(DEFAULT_SETTINGS);

async function getOrCreate(userId, client = null) {
  const db = client || pool;
  const existing = await db.query(
    'SELECT * FROM user_settings WHERE user_id = $1',
    [userId]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const result = await db.query(
    `INSERT INTO user_settings (user_id, settings)
     VALUES ($1, $2)
     RETURNING *`,
    [userId, JSON.stringify(DEFAULT_SETTINGS)]
  );
  return result.rows[0];
}

async function update(userId, mergedSettings, client = null) {
  const db = client || pool;
  const result = await db.query(
    `UPDATE user_settings
     SET settings = $1, updated_at = NOW()
     WHERE user_id = $2
     RETURNING *`,
    [JSON.stringify(mergedSettings), userId]
  );
  return result.rows[0];
}

module.exports = { getOrCreate, update, DEFAULT_SETTINGS, ALLOWED_SECTIONS };