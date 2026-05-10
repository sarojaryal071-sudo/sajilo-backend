const { pool } = require('../../config/database')

async function createCancellation({
  bookingId,
  cancelledById,
  cancelledByRole,
  statusAtCancel,
  workerId,
  reason,
  bookingCreatedAt,
}) {
  const result = await pool.query(
    `INSERT INTO booking_cancellations
      (booking_id, cancelled_by_id, cancelled_by_role, status_at_cancel, worker_id, reason, booking_created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [bookingId, cancelledById, cancelledByRole, statusAtCancel, workerId || null, reason || null, bookingCreatedAt]
  )
  return result.rows[0]
}

async function getUnacknowledgedForWorker(workerId) {
  const result = await pool.query(
    `SELECT * FROM booking_cancellations WHERE worker_id = $1 AND acknowledged = false`,
    [workerId]
  )
  return result.rows
}

async function acknowledge(cancellationId) {
  await pool.query(
    `UPDATE booking_cancellations SET acknowledged = true WHERE id = $1`,
    [cancellationId]
  )
}

module.exports = { createCancellation, getUnacknowledgedForWorker, acknowledge }