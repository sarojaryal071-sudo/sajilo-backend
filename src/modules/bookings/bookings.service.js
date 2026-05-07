const bookingsModel = require('./bookings.model')
const { getIO } = require('../realtime/socket')
const { pool } = require('../../config/database')
const chatModel = require('../chat/chat.model')   // ← new

// Standardized socket emitter
async function emitBookingEvent(event, booking, extra = {}) {
  const io = getIO()
  if (!io) return

  // Look up client_id for both parties so the event reaches the correct socket rooms
  const [customer, worker] = await Promise.all([
    pool.query(`SELECT client_id FROM users WHERE id = $1`, [booking.customer_id]),
    pool.query(`SELECT client_id FROM users WHERE id = $1`, [booking.worker_id]),
  ])
  const customerClientId = customer.rows[0]?.client_id || booking.customer_id
  const workerClientId = worker.rows[0]?.client_id || booking.worker_id

  const payload = {
    event,
    bookingId: booking.id,
    status: booking.status,
    customer_client_id: customerClientId,
    worker_client_id: workerClientId,
    job_type: booking.service_name || 'General Service',
    job_size: booking.job_size,
    price: booking.price,
    timestamp: new Date().toISOString(),
    ...extra,
  }

  // Emit to the two users’ personal rooms
  io.to(`user:${customerClientId}`).emit(event, payload)
  io.to(`user:${workerClientId}`).emit(event, payload)

  // Emit to the booking room (admin can join)
  io.to(`booking:${booking.id}`).emit(event, payload)

  // Emit to admin room
  io.to('room:admin_all').emit(event, payload)
}


async function createBooking({ customerId, workerId, serviceName, jobSize }) {
    // Verify worker exists and is online
  const workerResult = await pool.query(
    `SELECT id, is_online FROM users WHERE id = $1 AND role = 'worker'`,
    [workerId]
  )
  const worker = workerResult.rows[0]
  if (!worker) {
    throw new Error('Worker not found')
  }
  if (!worker.is_online) {
    throw new Error('Worker is currently offline and cannot accept new bookings')
  }

  const booking = await bookingsModel.create({
    customerId,
    workerId,
    serviceName: serviceName || 'General Service',
    jobSize: jobSize || 'medium',
  })

  emitBookingEvent('booking.created', booking)
  return booking
}

async function getBooking(bookingId) {
  const booking = await bookingsModel.findById(bookingId)
  if (!booking) throw new Error('Booking not found')
  return booking
}

async function getUserBookings(userId) {
  return bookingsModel.findByCustomerId(userId)
}

async function getWorkerBookings(workerId) {
  return bookingsModel.findByWorkerId(workerId)
}

async function acceptBooking(bookingId, workerId) {
  const booking = await bookingsModel.findById(bookingId)
  if (!booking) throw new Error('Booking not found')
  if (booking.worker_id !== workerId) throw new Error('Not your booking')
  if (booking.status !== 'pending') throw new Error('Can only accept pending bookings')
  
  const updated = await bookingsModel.updateStatus(bookingId, 'accepted')

  // ✅ Auto‑create customer‑worker conversation
  try {
    await chatModel.findOrCreateConversation(
      booking.customer_id,
      workerId,
      bookingId,
      'customer_worker'
    )
  } catch (err) {
    console.error('Failed to create conversation on accept:', err.message)
    // Don’t block the acceptance
  }

  emitBookingEvent('booking.accepted', updated)
  emitBookingEvent('booking.visibility.updated', updated, { visible: false })

  return updated
}

async function rejectBooking(bookingId, workerId) {
  const booking = await bookingsModel.findById(bookingId)
  if (!booking) throw new Error('Booking not found')
  if (booking.worker_id !== workerId) throw new Error('Not your booking')
  
  const updated = await bookingsModel.updateStatus(bookingId, 'rejected')
  
  emitBookingEvent('booking.rejected', updated)
  emitBookingEvent('booking.visibility.updated', updated, { visible: true })

  return updated
}

async function updateBookingStatus(bookingId, workerId, status) {
  const booking = await bookingsModel.findById(bookingId)
  if (!booking) throw new Error('Booking not found')
  if (booking.worker_id !== workerId) throw new Error('Not your booking')

  // ── Start‑Travel guards (only for 'onway') ──
  if (status === 'onway') {
    // Single active job: worker cannot have another active job
    const activeJobs = await bookingsModel.findActiveByWorkerId(workerId)
    if (activeJobs.length > 0) {
      throw new Error('Complete your current job before starting a new one.')
    }
  }

  const updated = await bookingsModel.updateStatus(bookingId, status)

  // Auto‑update earnings on completion
  if (status === 'completed') {
    await pool.query(
      `UPDATE users 
       SET total_earnings = total_earnings + $1,
           completed_jobs = completed_jobs + 1,
           updated_at = NOW()
       WHERE id = $2`,
      [booking.price || 0, workerId]
    )
  }

  emitBookingEvent(`booking.${status}`, updated)

  return updated
}

module.exports = { createBooking, getBooking, getUserBookings, getWorkerBookings, acceptBooking, rejectBooking, updateBookingStatus }