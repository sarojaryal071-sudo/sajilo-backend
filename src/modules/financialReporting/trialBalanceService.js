const { getAccountingEntriesByPeriod } = require('./financialAggregationService');

async function getTrialBalance({ from, to }) {
  const entries = await getAccountingEntriesByPeriod({ from, to });

  const accounts = {};
  let totalDebit = 0, totalCredit = 0;

  for (const e of entries) {
    const amt = parseFloat(e.amount);

    accounts[e.debit_account] = accounts[e.debit_account] || {
      account_code: e.debit_account,
      debit_total: 0,
      credit_total: 0,
    };
    accounts[e.debit_account].debit_total += amt;
    totalDebit += amt;

    accounts[e.credit_account] = accounts[e.credit_account] || {
      account_code: e.credit_account,
      debit_total: 0,
      credit_total: 0,
    };
    accounts[e.credit_account].credit_total += amt;
    totalCredit += amt;
  }

  const accountList = Object.values(accounts).map(acc => ({
    ...acc,
    balance: parseFloat((acc.debit_total - acc.credit_total).toFixed(2)),
  }));

  return {
    period: from ? `${from} / ${to}` : 'all',
    accounts: accountList,
    totals: {
      debit: parseFloat(totalDebit.toFixed(2)),
      credit: parseFloat(totalCredit.toFixed(2)),
      balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    },
  };
}

module.exports = { getTrialBalance };