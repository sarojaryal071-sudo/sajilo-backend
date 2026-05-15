// sajilo-backend/src/modules/payments/paymentTimeline.service.js
const { pool } = require('../../config/database');

const VALID_EVENT_TYPES = [
  'invoice_finalized',
  'client_cash_intent',
  'client_digital_intent',
  'worker_cash_confirmed',
  'digital_payment_confirmed',
  'ledger_recorded',
  'settlement_recorded',
];

/**
 * Append a timeline event.
 * NEVER throws – timeline is observational only.
 */
async function createPaymentEvent({
  bookingId,
  paymentId = null,
  eventType,
  performedByRole = null,
  performedById = null,
  provider = null,
  notes = null,
  metadata = {},
}) {
  if (!bookingId || !eventType) {
    console.error('[paymentTimeline] Missing bookingId or eventType');
    return null;
  }

  if (!VALID_EVENT_TYPES.includes(eventType)) {
    console.error(`[paymentTimeline] Invalid event type: ${eventType}`);
    return null;
  }

  try {
    const result = await pool.query(
      `INSERT INTO payment_events
         (booking_id, payment_id, event_type, performed_by_role, performed_by_id, provider, notes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        bookingId,
        paymentId,
        eventType,
        performedByRole,
        performedById,
        provider,
        notes,
        JSON.stringify(metadata),
      ]
    );
    return result.rows[0];
  } catch (err) {
    // Timeline is observational – never fail the caller
    console.error('[paymentTimeline] Failed to insert event:', err.message);
    return null;
  }
}

/**
 * Get the full chronological timeline for a booking.
 */
async function getBookingPaymentTimeline(bookingId) {
  try {
    const result = await pool.query(
      `SELECT * FROM payment_events
       WHERE booking_id = $1
       ORDER BY created_at ASC`,
      [bookingId]
    );
    return result.rows;
  } catch (err) {
    console.error('[paymentTimeline] Failed to fetch timeline:', err.message);
    return [];
  }
}

module.exports = {
  createPaymentEvent,
  getBookingPaymentTimeline,
};