const { getAccountingEntriesByPeriod } = require('./financialAggregationService');

async function getPlatformRevenue({ from, to }) {
  const entries = await getAccountingEntriesByPeriod({ from, to });

  let totalRevenue = 0, commission = 0, refunds = 0;

  for (const e of entries) {
    const amt = parseFloat(e.amount);
    if ((e.account_code === 'PLATFORM_REVENUE' || e.account_code === 'COMMISSION_INCOME') && e.credit_account === e.account_code) {
      if (e.account_code === 'PLATFORM_REVENUE') totalRevenue += amt;
      if (e.account_code === 'COMMISSION_INCOME') commission += amt;
    }
    if (e.account_code === 'REFUND' && e.debit_account === 'PLATFORM_REVENUE') {
      refunds += amt;
    }
  }

  const net = parseFloat((totalRevenue + commission - refunds).toFixed(2));
  return {
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    commission: parseFloat(commission.toFixed(2)),
    refunds: parseFloat(refunds.toFixed(2)),
    netIncome: net,
  };
}

module.exports = { getPlatformRevenue };