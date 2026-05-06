const bookingsModel = require('./bookings.model')
const { getIO } = require('../realtime/socket')
const { pool } = require('../../config/database')

// Standardized socket emitter
function emitBookingEvent(event, booking, extra = {}) {
  const io = getIO()
  if (!io) return

  const payload = {
    event,
    bookingId: booking.id,
    status: booking.status,
    workerId: booking.worker_id,
    customerId: booking.customer_id,
    timestamp: new Date().toISOString(),
    ...extra,
  }

  // Emit to involved users
  io.to(`user:${booking.customer_id}`).emit(event, payload)
  io.to(`user:${booking.worker_id}`).emit(event, payload)

  // Emit to booking room (for admin/support monitoring)
  io.to(`booking:${booking.id}`).emit(event, payload)

  // Emit to admin room
  io.to('room:admin_all').emit(event, payload)
}

async function createBooking({ customerId, workerId, serviceName, jobSize }) {
    // Verify worker exists and is online
  const { pool } = require('../../config/database')
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
  
  emitBookingEvent('booking.accepted', updated)
  // Notify other workers this booking is taken
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
  
  const updated = await bookingsModel.updateStatus(bookingId, status)

  // Auto-update earnings on completion
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

  // Emit specific status event
  emitBookingEvent(`booking.${status}`, updated)

  return updated
}

module.exports = { createBooking, getBooking, getUserBookings, getWorkerBookings, acceptBooking, rejectBooking, updateBookingStatus }