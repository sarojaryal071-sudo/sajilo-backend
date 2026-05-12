// sajilo-backend/src/modules/payments/payments.service.js
const paymentsModel = require('./payments.model');
const { PAYMENT_STATUS_REGISTRY } = require('../../config/operationalRegistries');
const auditService = require('../audit/audit.service');


/**
 * Auto-create a payment row when a booking is completed.
 */
async function ensurePaymentForCompletedBooking(booking) {
  const existing = await paymentsModel.findByBookingId(booking.id);
  if (existing) return existing;

  const subtotal = parseFloat(booking.total_amount || booking.price || 0);
  const platform_fee = 0;
  const worker_amount = subtotal;

  const payment = await paymentsModel.create({
    booking_id: booking.id,
    customer_id: booking.customer_id,
    worker_id: booking.worker_id,
    subtotal,
    platform_fee,
    worker_amount,
    total: subtotal,
    method: 'cash',
    status: PAYMENT_STATUS_REGISTRY.UNPAID,
    currency: booking.currency || 'NPR',
    invoice_number: null,
  });
  return payment;
}

/**
 * Worker confirms invoice with edits.
 */
async function confirmInvoiceWithEdits(bookingId, workerId, { discount_amount, extra_items, payment_method }) {
  const payment = await paymentsModel.findByBookingId(bookingId);
  if (!payment) throw new Error('Payment record not found');
  if (payment.worker_id !== workerId) throw new Error('Not authorized to confirm this invoice');
  if (payment.status !== PAYMENT_STATUS_REGISTRY.UNPAID) throw new Error('Invoice can only be confirmed when payment is unpaid');

  const extra = (extra_items || []).map(item => ({
    label: item.label || 'Extra charge',
    amount: parseFloat(item.amount) || 0,
  }));

  const updated = await paymentsModel.confirmInvoice(bookingId, {
    discount_amount: parseFloat(discount_amount) || 0,
    extra_items_json: extra,
    payment_method: payment_method || 'cash',
  });
  return updated;
}

/**
 * Shared core: mark a payment as paid, recording who did it.
 * Allowed only from status = pending_cash.
 */
async function markPaymentPaid(bookingId, paidByRole, paidByUserId) {
  const payment = await paymentsModel.findByBookingId(bookingId);
  if (!payment) throw new Error('Payment record not found');
  if (payment.status !== PAYMENT_STATUS_REGISTRY.PENDING_CASH) {
    throw new Error('Payment can only be made when invoice is pending cash confirmation');
  }
  // Additional validations (method check, user authorization) are done by the caller.

  const updated = await paymentsModel.markPaid(bookingId, paidByRole, paidByUserId);

  // ── Audit log the status transition ──
  try {
    await auditService.logAction({
      actorId: paidByUserId,
      actorRole: paidByRole,
      action: 'payment.status_change',
      entityType: 'payment',
      entityId: payment.id,                     // from the earlier find
      oldValue: { status: payment.status },
      newValue: { status: PAYMENT_STATUS_REGISTRY.PAID },
      metadata: { booking_id: bookingId },
    });
  } catch (auditErr) {
    console.error('Audit log write failed (non‑blocking):', auditErr.message);
  }

  return updated;
}

/**
 * Client pays with cash.
 * Allowed transition: pending_cash → paid
 */
async function confirmCashPayment(bookingId, customerId) {
  const payment = await paymentsModel.findByBookingId(bookingId);
  if (!payment) throw new Error('Payment record not found');
  if (payment.customer_id !== customerId) throw new Error('Not authorized to confirm this payment');
  // No method restriction for client; they can pay whatever method was selected.

  return markPaymentPaid(bookingId, 'customer', customerId);
}

/**
 * Worker marks cash payment as received (offline client).
 * Allowed only if payment method is 'cash'.
 */
async function markCashPaidByWorker(bookingId, workerId) {
  const payment = await paymentsModel.findByBookingId(bookingId);
  if (!payment) throw new Error('Payment record not found');
  if (payment.worker_id !== workerId) throw new Error('Not authorized to confirm this payment');
  if (payment.method !== 'cash') {
    throw new Error('Worker can only confirm cash payments');
  }

  return markPaymentPaid(bookingId, 'worker', workerId);
}

/**
 * Get payment record for a booking.
 */
async function getPaymentByBookingId(bookingId) {
  return paymentsModel.findByBookingId(bookingId);
}

/**
 * Get all payments for a worker.
 */
async function getWorkerPayments(workerId) {
  return paymentsModel.getByWorkerId(workerId);
}

/**
 * Get all payments for a customer.
 */
async function getCustomerPayments(customerId) {
  return paymentsModel.getByCustomerId(customerId);
}

module.exports = {
  ensurePaymentForCompletedBooking,
  confirmInvoiceWithEdits,
  confirmCashPayment,
  markCashPaidByWorker,
  getPaymentByBookingId,
  getWorkerPayments,
  getCustomerPayments,
};