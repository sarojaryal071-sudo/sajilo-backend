// Backend-authoritative support categories
// Frontend must fetch these via the API – do NOT duplicate in frontend.
module.exports = [
  { key: 'payment',       label: 'Payment',        icon: '💳' },
  { key: 'booking',       label: 'Booking',         icon: '📅' },
  { key: 'worker_issue',  label: 'Worker Issue',    icon: '👷' },
  { key: 'technical',     label: 'Technical',        icon: '🔧' },
  { key: 'account',       label: 'Account',          icon: '👤' },
  { key: 'refund',        label: 'Refund',           icon: '💰' },
  { key: 'verification',  label: 'Verification',     icon: '🆔' },
  { key: 'other',         label: 'Other',            icon: '📝' },
];