const { pool } = require('../../config/database')
const { getIO } = require('../realtime/socket')

// Submit a review for a completed booking
async function createReview(bookingId, customerId, rating, reviewText = null) {
  // 1. Verify booking exists and belongs to this customer
  const bookingResult = await pool.query(
    `SELECT * FROM bookings WHERE id = $1 AND customer_id = $2 AND status = 'completed'`,
    [bookingId, customerId]
  )
  const booking = bookingResult.rows[0]
  if (!booking) throw new Error('Booking not found or not eligible for review')

  // 2. Ensure only one review per booking
  const existing = await pool.query(
    `SELECT id FROM reviews WHERE booking_id = $1`,
    [bookingId]
  )
  if (existing.rows.length > 0) throw new Error('You have already reviewed this booking')

  // 3. Validate rating
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5')
  }

  // 4. Insert the review
  const result = await pool.query(
    `INSERT INTO reviews (booking_id, customer_id, worker_id, rating, review_text)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [bookingId, customerId, booking.worker_id, rating, reviewText || null]
  )
  // Emit socket event for live updates (include prefixed client IDs)
  try {
    const io = getIO()
    if (io) {
      const review = result.rows[0]

      // Look up client_id for both parties (matching existing booking pattern)
      const [customer, worker] = await Promise.all([
        pool.query(`SELECT client_id FROM users WHERE id = $1`, [review.customer_id]),
        pool.query(`SELECT client_id FROM users WHERE id = $1`, [review.worker_id]),
      ])

      io.emit('review.created', {
        reviewId: review.id,
        bookingId: review.booking_id,
        workerId: review.worker_id,
        workerClientId: worker.rows[0]?.client_id || `W${review.worker_id}`,
        customerId: review.customer_id,
        customerClientId: customer.rows[0]?.client_id || `C${review.customer_id}`,
        rating: review.rating,
        reviewText: review.review_text,
        createdAt: review.created_at,
      })
    }
  } catch (err) {
    console.error('Socket emission failed:', err.message)
  }

  return result.rows[0]
}

// Get average rating and review count for a worker
async function getWorkerRating(workerId) {
  const result = await pool.query(
    `SELECT COALESCE(ROUND(AVG(rating), 1), 0) as average_rating,
            COUNT(*)::int as review_count
     FROM reviews WHERE worker_id = $1`,
    [workerId]
  )
  return result.rows[0]
}

// Get all reviews for a worker (latest first)
async function getWorkerReviews(workerId) {
  const result = await pool.query(
    `SELECT r.*, u.client_id as customer_client_id, u.name as customer_name
     FROM reviews r
     JOIN users u ON r.customer_id = u.id
     WHERE r.worker_id = $1
     ORDER BY r.created_at DESC`,
    [workerId]
  )
  return result.rows
}

module.exports = { createReview, getWorkerRating, getWorkerReviews }