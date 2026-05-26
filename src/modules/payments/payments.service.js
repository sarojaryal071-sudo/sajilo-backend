const paymentsModel = require('./payments.model');
const { PAYMENT_STATUS_REGISTRY } = require('../../config/operationalRegistries');
const activityService = require('../activity/activity.service');
const { logAuditEvent } = require('../../services/audit.service');
const { pool } = require('../../config/database');
const notificationsService = require('../notification/notification.service');

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

  // ── Audit: invoice generated ──
  try {
    await logAuditEvent({
      req: null, // service doesn't have req
      actorId: workerId,
      action: 'payment.invoice_generated',
      entityType: 'payment',
      entityId: updated.id,
      entityDisplay: `Booking #${bookingId}`,
      summary: `Invoice generated for booking #${bookingId}`,
      severity: 'low',
      category: 'payments',
      outcome: 'success',
      newValues: {
        status: updated.status,
        final_total: updated.final_total || updated.total,
        payment_method: updated.method,
      },
      contextSnapshot: { booking_id: bookingId },
    });
  } catch (auditErr) {
    console.error('Audit write failed (invoice generated):', auditErr);
  }

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

  // Notify customer – invoice ready
  try {
    await notificationsService.createNotification({
      userId: payment.customer_id,
      userRole: 'customer',
      type: 'payment',
      title: 'Invoice Ready',
      message: `Invoice for booking #${bookingId} is ready for review.`,
      entityType: 'payment',
      entityId: updated.id,
      metadata: { action: 'invoice_ready', invoiceId: updated.id, bookingId },
    });
  } catch (err) { console.error('Notification failed (invoice_ready):', err.message); }

  // ── Ledger: append invoice_finalized entry (non-blocking) ──
  try {
    const ledgerService = require('../financialLedger/ledger.service');
    await ledgerService.createInvoiceFinalizedEntry(updated, workerId);
  } catch (err) {
    console.error('Ledger entry failed (invoice_finalized) – continuing:', err.message);
  }

  // ── Payment Timeline: invoice_finalized ──
  try {
    const { createPaymentEvent } = require('./paymentTimeline.service');
    await createPaymentEvent({
      bookingId,
      paymentId: updated.id,
      eventType: 'invoice_finalized',
      performedByRole: 'worker',
      performedById: workerId,
      metadata: {
        final_total: parseFloat(updated.final_total || updated.total || 0),
        discount: parseFloat(updated.discount_amount || 0),
        extra_charges: updated.extra_items_json || [],
      },
    });
  } catch (err) {
    console.error('[paymentTimeline] invoice_finalized hook failed:', err.message);
  }

  return updated;
}

/**
 * Shared core: mark a payment as paid, recording who did it.
 * Allowed only from status = pending_cash.
 */
async function markPaymentPaid(bookingId, paidByRole, paidByUserId, metadata = {}) {
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

  const updated = await paymentsModel.markPaid(bookingId, paidByRole, paidByUserId, metadata);

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

  // ── Ledger: append payment_confirmed entry ──
  try {
    const ledgerService = require('../financialLedger/ledger.service');
    const ledgerEntry = await ledgerService.createPaymentConfirmedEntry(updated, paidByRole, paidByUserId);

    try {
      const { createPaymentEvent } = require('./paymentTimeline.service');
      await createPaymentEvent({
        bookingId,
        paymentId: updated.id,
        eventType: 'ledger_recorded',
        performedByRole: 'system',
        metadata: { ledger_entry_id: ledgerEntry?.id },
      });
    } catch (err) {
      console.error('[paymentTimeline] ledger_recorded hook failed:', err.message);
    }
  } catch (err) {
    console.error('Ledger entry failed (payment_confirmed) – continuing:', err.message);
  }

  // ── Payment Timeline: payment confirmation ──
  try {
    const { createPaymentEvent } = require('./paymentTimeline.service');
    const eventType = updated.confirmation_source === 'client_digital'
      ? 'digital_payment_confirmed'
      : 'worker_cash_confirmed';
    await createPaymentEvent({
      bookingId,
      paymentId: updated.id,
      eventType,
      performedByRole: paidByRole,
      performedById: paidByUserId,
      provider: updated.payment_provider || null,
      metadata: {
        confirmation_source: updated.confirmation_source,
        payment_channel_id: updated.payment_channel_id || null,
      },
    });
  } catch (err) {
    console.error('[paymentTimeline] payment confirmation hook failed:', err.message);
  }

  // ── Audit: payment confirmed ──
  try {
    await logAuditEvent({
      req: null,
      actorId: paidByUserId,
      action: 'payment.confirmed',
      entityType: 'payment',
      entityId: updated.id,
      entityDisplay: `Booking #${bookingId}`,
      summary: `Payment confirmed for booking #${bookingId} by ${paidByRole}`,
      severity: 'medium',
      category: 'payments',
      outcome: 'success',
      oldValues: { status: payment.status },
      newValues: { status: updated.status, method: updated.method },
      contextSnapshot: {
        booking_id: bookingId,
        confirmation_source: updated.confirmation_source,
      },
    });
  } catch (auditErr) {
    console.error('Audit write failed (payment confirmed):', auditErr);
  }

  // Notify both parties about payment confirmation
  try {
    await notificationsService.createNotification({
      userId: payment.customer_id,
      userRole: 'customer',
      type: 'payment',
      title: 'Payment Confirmed',
      message: `Payment for booking #${bookingId} has been confirmed.`,
      entityType: 'payment',
      entityId: updated.id,
      metadata: { action: 'paid', invoiceId: updated.id, bookingId, payerRole: paidByRole, receiverRole: 'worker' },
    });
    await notificationsService.createNotification({
      userId: payment.worker_id,
      userRole: 'worker',
      type: 'payment',
      title: 'Payment Received',
      message: `Payment for booking #${bookingId} has been received.`,
      entityType: 'payment',
      entityId: updated.id,
      metadata: { action: 'paid', invoiceId: updated.id, bookingId, payerRole: 'customer', receiverRole: 'worker' },
    });
  } catch (err) { console.error('Notification failed (payment_paid):', err.message); }

  return updated;
}

/**
 * Client pays with cash.
 */
async function confirmCashPayment(bookingId, customerId) {
  const payment = await paymentsModel.findByBookingId(bookingId);
  if (!payment) throw new Error('Payment record not found');
  if (payment.customer_id !== customerId) throw new Error('Not authorized to confirm this payment');
  return markPaymentPaid(bookingId, 'customer', customerId, {
    confirmationSource: 'client_cash',
    confirmedBy: customerId,
  });
}

/**
 * Worker marks cash payment as received (offline client).
 */
async function markCashPaidByWorker(bookingId, workerId) {
  const payment = await paymentsModel.findByBookingId(bookingId);
  if (!payment) throw new Error('Payment record not found');
  if (payment.worker_id !== workerId) throw new Error('Not authorized to confirm this payment');
  if (payment.method !== 'cash') {
    throw new Error('Worker can only confirm cash payments');
  }
  return markPaymentPaid(bookingId, 'worker', workerId, {
    confirmationSource: 'worker_cash',
    confirmedBy: workerId,
  });
}

async function confirmDigitalPayment(bookingId, customerId, { payment_channel_id, provider }) {
  const payment = await paymentsModel.findByBookingId(bookingId);
  if (!payment) throw new Error('Payment record not found');
  if (payment.customer_id !== customerId) throw new Error('Not authorized');

  if (payment.status === 'paid') throw new Error('Payment already confirmed');

  await pool.query(
    `UPDATE payments SET payment_provider = $1, payment_channel_id = $2, method = 'digital', client_initiated_at = NOW() WHERE id = $3`,
    [provider, payment_channel_id, payment.id]
  );

  try {
    const { createPaymentEvent } = require('./paymentTimeline.service');
    await createPaymentEvent({
      bookingId,
      paymentId: payment.id,
      eventType: 'client_digital_intent',
      performedByRole: 'customer',
      performedById: customerId,
      provider: provider,
      metadata: { payment_channel_id: payment_channel_id },
    });
  } catch (err) {
    console.error('[paymentTimeline] client_digital_intent hook failed:', err.message);
  }

  return markPaymentPaid(bookingId, 'customer', customerId, {
    confirmationSource: 'client_digital',
    confirmedBy: customerId,
  });
}

async function setClientInitiated(paymentId, channelId, provider) {
  await pool.query(
    `UPDATE payments SET client_initiated_at = NOW(), payment_channel_id = $2, payment_provider = $3 WHERE id = $1`,
    [paymentId, channelId || null, provider || null]
  );
}

async function getPaymentByBookingId(bookingId) {
  return paymentsModel.findByBookingId(bookingId);
}

async function getWorkerPayments(workerId) {
  return paymentsModel.getByWorkerId(workerId);
}

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