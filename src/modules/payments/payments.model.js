// sajilo-backend/src/modules/payments/payments.model.js
const { pool } = require('../../config/database');
const { PAYMENT_STATUS_REGISTRY } = require('../../config/operationalRegistries');

/**
 * Create a new payment record.
 */
async function create(paymentData) {
  const {
    booking_id, customer_id, worker_id,
    subtotal, platform_fee, worker_amount, total,
    method = 'cash',
    currency = 'NPR',
    invoice_number = null,
    status = PAYMENT_STATUS_REGISTRY.UNPAID
  } = paymentData;

  const result = await pool.query(
    `INSERT INTO payments 
      (booking_id, customer_id, worker_id, subtotal, platform_fee, worker_amount, total, method, currency, invoice_number, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [booking_id, customer_id, worker_id, subtotal, platform_fee, worker_amount, total, method, currency, invoice_number, status]
  );
  return result.rows[0];
}

/**
 * Find a payment by its booking ID.
 */
async function findByBookingId(bookingId) {
  const result = await pool.query(
    'SELECT * FROM payments WHERE booking_id = $1',
    [bookingId]
  );
  return result.rows[0] || null;
}

/**
 * Find a payment by its UUID payment_id.
 */
async function findById(paymentId) {
  const result = await pool.query(
    'SELECT * FROM payments WHERE payment_id = $1',
    [paymentId]
  );
  return result.rows[0] || null;
}

/**
 * Update payment status (and optionally set paid_at).
 */
async function updateStatus(bookingId, newStatus, paidAt = null) {
  const params = [newStatus, bookingId];
  let query = 'UPDATE payments SET status = $1, updated_at = NOW()';

  if (paidAt) {
    query += ', paid_at = $3';
    params.push(paidAt);
  }

  query += ' WHERE booking_id = $2 RETURNING *';
  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

/**
 * Get all payments for a worker.
 */
async function getByWorkerId(workerId) {
  const result = await pool.query(
    'SELECT * FROM payments WHERE worker_id = $1 ORDER BY created_at DESC',
    [workerId]
  );
  return result.rows;
}

/**
 * Get all payments for a customer.
 */
async function getByCustomerId(customerId) {
  const result = await pool.query(
    'SELECT * FROM payments WHERE customer_id = $1 ORDER BY created_at DESC',
    [customerId]
  );
  return result.rows;
}

/**
 * Worker confirms invoice with edits.
 * The backend authoritatively computes final_total.
 * Sets status to 'pending_cash' and records confirmation timestamp.
 */
async function confirmInvoice(bookingId, { discount_amount, extra_items_json, payment_method }) {
  // Fetch current payment to get the base subtotal
  const payment = await findByBookingId(bookingId);
  if (!payment) throw new Error('Payment record not found');

  const subtotal = parseFloat(payment.subtotal);
  const discount = parseFloat(discount_amount || 0);
  let extraTotal = 0;
  if (extra_items_json && Array.isArray(extra_items_json)) {
    extraTotal = extra_items_json.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }
  const final_total = subtotal - discount + extraTotal;

  const result = await pool.query(
    `UPDATE payments 
     SET discount_amount = $1,
         extra_items_json = $2::jsonb,
         final_total = $3,
         method = $4,
         status = '${PAYMENT_STATUS_REGISTRY.PENDING_CASH}',
         invoice_confirmed_at = NOW(),
         updated_at = NOW()
     WHERE booking_id = $5
     RETURNING *`,
    [discount_amount, JSON.stringify(extra_items_json), final_total, payment_method || 'cash', bookingId]
  );
  return result.rows[0];
}

/**
 * Mark a payment as paid, recording who did it.
 * @param {number} bookingId
 * @param {string} paidByRole - 'worker' or 'customer'
 * @param {number} paidByUserId - the user ID who marked it paid
 */
async function markPaid(bookingId, paidByRole, paidByUserId) {
  const result = await pool.query(
    `UPDATE payments 
     SET status = '${PAYMENT_STATUS_REGISTRY.PAID}',
         paid_at = NOW(),
         paid_by_role = $1,
         paid_by_user = $2,
         updated_at = NOW()
     WHERE booking_id = $3
     RETURNING *`,
    [paidByRole, paidByUserId, bookingId]
  );
  return result.rows[0] || null;
}

module.exports = {
  create,
  findByBookingId,
  findById,
  updateStatus,
  getByWorkerId,
  getByCustomerId,
  confirmInvoice,
  markPaid,
};