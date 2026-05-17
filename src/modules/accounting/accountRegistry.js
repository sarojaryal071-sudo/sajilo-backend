// sajilo-backend/src/modules/accounting/accountRegistry.js
const { pool } = require('../../config/database'); // adjust if needed – uses existing db pool

let accountCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

async function getAllAccounts() {
  const now = Date.now();
  if (accountCache && (now - cacheTimestamp) < CACHE_TTL) {
    return accountCache;
  }
  const result = await pool.query(
    'SELECT id, code, name, type, is_active FROM accounts WHERE is_active = true ORDER BY code'
  );
  accountCache = result.rows;
  cacheTimestamp = now;
  return accountCache;
}

async function getAccountByCode(code) {
  const accounts = await getAllAccounts();
  return accounts.find(acc => acc.code === code) || null;
}

async function validateAccount(code) {
  const account = await getAccountByCode(code);
  if (!account) {
    throw new Error(`Account with code "${code}" not found or inactive`);
  }
  return account;
}

function clearCache() {
  accountCache = null;
  cacheTimestamp = 0;
}

module.exports = {
  getAccountByCode,
  getAllAccounts,
  validateAccount,
  clearCache,
};