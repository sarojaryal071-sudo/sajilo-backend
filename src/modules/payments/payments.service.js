// sajilo-backend/src/modules/payments/payments.service.js
const paymentsModel = require('./payments.model');
const { PAYMENT_STATUS_REGISTRY } = require('../../config/operationalRegistries');
const activityService = require('../activity/activity.service');
const auditService = require('../audit/audit.service');
const { pool } = require('../../config/database');

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

  // Log activity
  try {
    await activityService.logActivity({
      type: 'payment',
      action: 'created',
      entityType: 'payment',
      entityId: updated.id,
      title: `Invoice for booking #${bookingId} generated`,
      metadata: { booking_id: bookingId, worker_id: workerId, status: updated.status },
      createdBy: workerId,
    });
  } catch (err) { console.error('Activity log failed (invoice generated):', err.message); }

  // ── Ledger: append invoice_finalized entry (non-blocking) ──
  try {
    const ledgerService = require('../financialLedger/ledger.service');
    await ledgerService.createInvoiceFinalizedEntry(updated, workerId);
  } catch (err) {
    console.error('Ledger entry failed (invoice_finalized) – continuing:', err.message);
  }

  return updated;
}

/**
 * Shared core: mark a payment as paid, recording who did it.
 * Allowed only from status = pending_cash.
 */
async function markPaymentPaid(bookingId, paidByRole, paidByUserId) {
  const payment = await paymentsModel.findByBookingId(bookingId);
  if (!payment) throw new Error('Payment record not found');
  const allowedStatuses = [
    PAYMENT_STATUS_REGISTRY.PENDING_CASH,
    PAYMENT_STATUS_REGISTRY.AWAITING_CASH_CONFIRMATION,
    PAYMENT_STATUS_REGISTRY.AWAITING_DIGITAL_CONFIRMATION,
  ];
  if (!allowedStatuses.includes(payment.status)) {
    throw new Error('Payment can only be made when invoice is awaiting confirmation');
  }
  // Additional validations (method check, user authorization) are done by the caller.

  const updated = await paymentsModel.markPaid(bookingId, paidByRole, paidByUserId);

  // Log activity
  try {
    await activityService.logActivity({
      type: 'payment',
      action: 'completed',
      entityType: 'payment',
      entityId: updated.id,
      title: `Payment for booking #${bookingId} completed (by ${paidByRole})`,
      metadata: { booking_id: bookingId, paid_by: paidByRole, paid_by_user: paidByUserId },
      createdBy: paidByUserId,
    });
  } catch (err) { console.error('Activity log failed (payment completed):', err.message); }

  // ── Ledger: append payment_confirmed entry (centralized for all paths) ──
  try {
    const ledgerService = require('../financialLedger/ledger.service');
    await ledgerService.createPaymentConfirmedEntry(updated, paidByRole, paidByUserId);
  } catch (err) {
    console.error('Ledger entry failed (payment_confirmed) – continuing:', err.message);
  }

  return updated;

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

  const updated = await markPaymentPaid(bookingId, 'worker', workerId);

  return updated;
}


async function confirmDigitalPayment(bookingId, workerId) {
  const payment = await paymentsModel.findByBookingId(bookingId);
  console.log('DEBUG confirmDigitalPayment - payment:', JSON.stringify(payment, null, 2));
  if (!payment) throw new Error('Payment record not found');
  if (payment.worker_id !== workerId) throw new Error('Not authorized');
  
  // Allow digital confirmation when a provider is set, regardless of exact status
  if (!payment.payment_provider) {
    throw new Error('No digital payment provider selected');
  }
  
  const allowedStatuses = [
    PAYMENT_STATUS_REGISTRY.PENDING_CASH,
    PAYMENT_STATUS_REGISTRY.AWAITING_CASH_CONFIRMATION,
    PAYMENT_STATUS_REGISTRY.AWAITING_DIGITAL_CONFIRMATION,
  ];
  if (!allowedStatuses.includes(payment.status)) {
    throw new Error('Payment cannot be confirmed in current status');
  }

  return markPaymentPaid(bookingId, 'worker', workerId);
}


/**
 * Record that the client has initiated payment (intent only, no status change).
 */
async function setClientInitiated(paymentId, channelId, provider) {
  await pool.query(
    `UPDATE payments SET client_initiated_at = NOW(), payment_channel_id = $2, payment_provider = $3 WHERE id = $1`,
    [paymentId, channelId || null, provider || null]
  );
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

async function initiateDigitalPayment(bookingId, customerId) {
  const payment = await paymentsModel.findByBookingId(bookingId);
  if (!payment) throw new Error('Payment record not found');
  if (payment.customer_id !== customerId) throw new Error('Not authorized');
  if (payment.status !== PAYMENT_STATUS_REGISTRY.UNPAID && payment.status !== PAYMENT_STATUS_REGISTRY.AWAITING_DIGITAL_CONFIRMATION) {
    throw new Error('Payment cannot be initiated in current status');
  }
  return paymentsModel.updateStatus(bookingId, PAYMENT_STATUS_REGISTRY.AWAITING_DIGITAL_CONFIRMATION);
}

module.exports = {
  ensurePaymentForCompletedBooking,
  confirmInvoiceWithEdits,
  confirmCashPayment,
  markCashPaidByWorker,
  confirmDigitalPayment,
  initiateDigitalPayment,
  setClientInitiated,
  getPaymentByBookingId,
  getWorkerPayments,
  getCustomerPayments,
};