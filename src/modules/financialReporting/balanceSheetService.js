const { pool } = require('../../config/database');
const { getAccountingEntriesByPeriod } = require('./financialAggregationService');

async function getBalanceSheet({ asOf }) {
  const entries = await getAccountingEntriesByPeriod({ to: asOf });

  const accounts = {};
  for (const e of entries) {
    const amt = parseFloat(e.amount);
    accounts[e.debit_account] = accounts[e.debit_account] || { code: e.debit_account, balance: 0 };
    accounts[e.credit_account] = accounts[e.credit_account] || { code: e.credit_account, balance: 0 };
    accounts[e.debit_account].balance += amt;
    accounts[e.credit_account].balance -= amt;
  }

  const { rows: accTypes } = await pool.query('SELECT code, type FROM accounts WHERE is_active = true');
  const typeMap = Object.fromEntries(accTypes.map(r => [r.code, r.type]));

  const assets = [], liabilities = [], equity = [];
  for (const [code, data] of Object.entries(accounts)) {
    const type = typeMap[code] || 'EQUITY';
    const item = { account_code: code, balance: parseFloat(data.balance.toFixed(2)) };
    if (type === 'ASSET') assets.push(item);
    else if (type === 'LIABILITY') liabilities.push(item);
    else equity.push(item);
  }

  const totalAssets = parseFloat(assets.reduce((s, a) => s + a.balance, 0).toFixed(2));
  const totalLiabilities = parseFloat(liabilities.reduce((s, l) => s + l.balance, 0).toFixed(2));
  const totalEquity = parseFloat((totalAssets - totalLiabilities).toFixed(2));

  return {
    asOf,
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equity,
    totalEquity,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
}

module.exports = { getBalanceSheet };