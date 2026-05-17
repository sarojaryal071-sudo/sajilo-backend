const { getAccountingEntriesByPeriod } = require('./financialAggregationService');

async function getProfitLoss({ from, to }) {
  const entries = await getAccountingEntriesByPeriod({ from, to });

  let revenue = 0, expenses = 0;

  for (const e of entries) {
    const amt = parseFloat(e.amount);
    if (e.account_type === 'INCOME') {
      if (e.credit_account === e.account_code) revenue += amt;
    } else if (e.account_type === 'EXPENSE') {
      if (e.debit_account === e.account_code) expenses += amt;
    }
  }

  const profit = parseFloat((revenue - expenses).toFixed(2));
  return { revenue, expenses, profit };
}

module.exports = { getProfitLoss };