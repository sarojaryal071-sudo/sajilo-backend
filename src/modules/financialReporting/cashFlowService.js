const { getProfitLoss } = require('./profitLossService');
const { getBalanceSheet } = require('./balanceSheetService');

async function getCashFlow({ from, to }) {
  const pl = await getProfitLoss({ from, to });
  const netIncome = pl.profit;

  const bsStart = await getBalanceSheet({ asOf: from });
  const bsEnd = await getBalanceSheet({ asOf: to });

  function getBalance(bs, code) {
    const item = [...bs.assets, ...bs.liabilities, ...bs.equity].find(a => a.account_code === code);
    return item ? item.balance : 0;
  }

  const cashStart = getBalance(bsStart, 'CASH');
  const cashEnd = getBalance(bsEnd, 'CASH');
  const receivablesStart = getBalance(bsStart, 'CUSTOMER_PAYABLE');
  const receivablesEnd = getBalance(bsEnd, 'CUSTOMER_PAYABLE');
  const payablesStart = getBalance(bsStart, 'WORKER_PAYABLE');
  const payablesEnd = getBalance(bsEnd, 'WORKER_PAYABLE');

  const changeReceivables = receivablesEnd - receivablesStart;
  const changePayables = payablesEnd - payablesStart;

  const operatingCashFlow = parseFloat((netIncome - changeReceivables + changePayables).toFixed(2));
  const netCashFlow = parseFloat((cashEnd - cashStart).toFixed(2));

  return {
    period: `${from} → ${to}`,
    netIncome,
    operatingCashFlow,
    netCashFlow,
    adjustments: {
      changeInReceivables: parseFloat(changeReceivables.toFixed(2)),
      changeInPayables: parseFloat(changePayables.toFixed(2)),
    },
  };
}

module.exports = { getCashFlow };