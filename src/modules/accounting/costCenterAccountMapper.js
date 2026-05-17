// sajilo-backend/src/modules/accounting/costCenterAccountMapper.js
// Maps cost center to accounting account (for future use).
// Not integrated yet; placeholder.

const DEFAULT_MAPPING = {
  INFRASTRUCTURE: 'ADJUSTMENT', // or specific expense account if added
  PAYMENT_PROCESSING: 'ADJUSTMENT',
  PLATFORM_OPERATIONS: 'ADJUSTMENT',
  WORKER_OPERATIONS: 'ADJUSTMENT',
  MARKETING: 'ADJUSTMENT',
  GENERAL_ADMIN: 'ADJUSTMENT',
};

function mapCostCenterToAccount(costCenterCode) {
  return DEFAULT_MAPPING[costCenterCode] || 'ADJUSTMENT';
}

module.exports = { mapCostCenterToAccount };