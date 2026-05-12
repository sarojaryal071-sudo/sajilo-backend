// sajilo-backend/src/modules/payments/payments.controller.js
const paymentsService = require('./payments.service');
const { getIO } = require('../realtime/socket');
const { pool } = require('../../config/database');
const { getUserRoom } = require('../../utils/socketRooms');
const notificationsService = require('../notification/notification.service');

/**
 * Helper: emit payment.updated to relevant rooms
 */
async function emitPaymentUpdated(payment) {
  const io = getIO();
  if (!io) return;

  try {
    const [customer, worker] = await Promise.all([
      pool.query('SELECT client_id FROM users WHERE id = $1', [payment.customer_id]),
      pool.query('SELECT client_id FROM users WHERE id = $1', [payment.worker_id]),
    ]);
    const customerClientId = customer.rows[0]?.client_id || `U${payment.customer_id}`;
    const workerClientId = worker.rows[0]?.client_id || `U${payment.worker_id}`;
    const payload = {
      event: 'payment.updated',
      payment_id: payment.payment_id,
      booking_id: payment.booking_id,
      status: payment.status,
      method: payment.method,
    };
    io.to(`user:${customerClientId}`).emit('payment.updated', payload);
    io.to(`user:${workerClientId}`).emit('payment.updated', payload);
    io.to(`booking:${payment.booking_id}`).emit('payment.updated', payload);
    io.to('room:admin_all').emit('payment.updated', payload);
  } catch (err) {
    console.error('Failed to emit payment.updated:', err);
  }
}

/**
 * GET /api/payments/booking/:bookingId
 */
async function getByBooking(req, res) {
  try {
    const { bookingId } = req.params;
    const payment = await paymentsService.getPaymentByBookingId(Number(bookingId));
    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }
    return res.json({ payment });
  } catch (err) {
    console.error('getByBooking error:', err);
    return res.status(500).json({ error: 'Failed to fetch payment' });
  }
}

/**
 * PUT /api/payments/booking/:bookingId/confirm-invoice
 * Worker confirms the invoice: unpaid → pending_cash
 */
async function confirmInvoice(req, res) {
  try {
    const { bookingId } = req.params;
    const workerId = req.user?.id;
    const { discount_amount, extra_items, payment_method } = req.body || {};

    // ── Validation hardening (Phase 13A) ──
    const numericBookingId = Number(bookingId);
    if (!Number.isInteger(numericBookingId) || numericBookingId < 1) {
      return res.status(400).json({ error: 'Invalid booking ID – must be a positive integer' });
    }
    if (!workerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (discount_amount !== undefined && (typeof discount_amount !== 'number' || discount_amount < 0)) {
      return res.status(400).json({ error: 'discount_amount must be a non‑negative number' });
    }
    if (extra_items !== undefined && !Array.isArray(extra_items)) {
      return res.status(400).json({ error: 'extra_items must be an array' });
    }
    if (payment_method !== undefined && typeof payment_method !== 'string') {
      return res.status(400).json({ error: 'payment_method must be a string' });
    }
    // ─────────────────────────────────────

    const payment = await paymentsService.getPaymentByBookingId(numericBookingId);
    if (!payment || payment.worker_id !== workerId) {
      return res.status(403).json({ error: 'You are not authorized to confirm this invoice' });
    }

    const updated = await paymentsService.confirmInvoiceWithEdits(
      numericBookingId,
      workerId,
      { discount_amount, extra_items, payment_method }
    );
    await emitPaymentUpdated(updated);

    // Notify customer that invoice is ready
    try {
      await notificationsService.createNotification({
        userId: updated.customer_id,
        userRole: 'customer',
        type: 'invoice_ready',
        title: 'Invoice ready',
        message: `Invoice for booking #${bookingId} is ready for payment`,
        entityType: 'payment',
        entityId: updated.id,
        metadata: { booking_id: numericBookingId, payment_id: updated.payment_id },
      });
    } catch (err) {
      console.error('Notification creation failed (invoice_ready):', err);
    }

    return res.json({ payment: updated });
  } catch (err) {
    console.error('confirmInvoice error:', err);
    return res.status(400).json({ error: err.message || 'Failed to confirm invoice' });
  }
}

/**
 * PUT /api/payments/booking/:bookingId/confirm
 * Client confirms cash payment: pending_cash → paid
 */
async function confirmCash(req, res) {
  try {
    const { bookingId } = req.params;
    const customerId = req.user?.id;

    if (!customerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payment = await paymentsService.getPaymentByBookingId(Number(bookingId));
    if (!payment || payment.customer_id !== customerId) {
      return res.status(403).json({ error: 'You are not authorized to confirm this payment' });
    }

    const updated = await paymentsService.confirmCashPayment(Number(bookingId), customerId);
    await emitPaymentUpdated(updated);

    // Notify the worker that payment has been made
    try {
      await notificationsService.createNotification({
        userId: updated.worker_id,
        userRole: 'worker',
        type: 'payment_paid',
        title: 'Payment received',
        message: `Payment for booking #${bookingId} has been paid`,
        entityType: 'payment',
        entityId: updated.id,
        metadata: { booking_id: Number(bookingId), payment_id: updated.payment_id, paid_by: 'customer' },
      });
    } catch (err) {
      console.error('Notification creation failed (payment_paid by customer):', err);
    }

    return res.json({ payment: updated });
  } catch (err) {
    console.error('confirmCash error:', err);
    return res.status(400).json({ error: err.message || 'Failed to confirm payment' });
  }
}

/**
 * GET /api/payments/worker/:workerId
 */
async function getWorkerPayments(req, res) {
  try {
    const { workerId } = req.params;
    const payments = await paymentsService.getWorkerPayments(Number(workerId));
    return res.json({ payments });
  } catch (err) {
    console.error('getWorkerPayments error:', err);
    return res.status(500).json({ error: 'Failed to fetch worker payments' });
  }
}

/**
 * PUT /api/payments/booking/:bookingId/mark-cash-paid
 * Worker marks cash payment as received (offline client).
 * Only allowed when method is 'cash' and status is 'pending_cash'.
 */
async function markCashPaid(req, res) {
  try {
    const { bookingId } = req.params;
    const workerId = req.user?.id;

    if (!workerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const updated = await paymentsService.markCashPaidByWorker(Number(bookingId), workerId);
    await emitPaymentUpdated(updated);

    // Notify customer that payment was confirmed by worker
    try {
      await notificationsService.createNotification({
        userId: updated.customer_id,
        userRole: 'customer',
        type: 'payment_paid',
        title: 'Payment confirmed',
        message: `Payment for booking #${bookingId} has been confirmed by the worker`,
        entityType: 'payment',
        entityId: updated.id,
        metadata: { booking_id: Number(bookingId), payment_id: updated.payment_id, paid_by: 'worker' },
      });
    } catch (err) {
      console.error('Notification creation failed (payment_paid by worker):', err);
    }

    return res.json({ payment: updated });
  } catch (err) {
    console.error('markCashPaid error:', err);
    return res.status(400).json({ error: err.message || 'Failed to confirm cash received' });
  }
}

/**
 * GET /api/payments/customer/:customerId
 */
async function getCustomerPayments(req, res) {
  try {
    const { customerId } = req.params;
    const payments = await paymentsService.getCustomerPayments(Number(customerId));
    return res.json({ payments });
  } catch (err) {
    console.error('getCustomerPayments error:', err);
    return res.status(500).json({ error: 'Failed to fetch customer payments' });
  }
}

module.exports = {
  getByBooking,
  confirmInvoice,
  confirmCash,
  markCashPaid,
  getWorkerPayments,
  getCustomerPayments,
};