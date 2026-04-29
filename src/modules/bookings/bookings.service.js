const bookingsModel = require('./bookings.model')
const { getIO } = require('../realtime/socket')
const { pool } = require('../../config/database')

async function createBooking({ customerId, workerId, serviceName, jobSize }) {
  if (!customerId || !workerId || !serviceName) {
    throw new Error('customerId, workerId, and serviceName are required')
  }

  const booking = await bookingsModel.create({
    customerId,
    workerId,
    serviceName: serviceName || 'General Service',
    jobSize: jobSize || 'medium',
  })

  const io = getIO()
  if (io) {
    io.to(`user:${workerId}`).emit('booking.created', booking)
  }

  return booking
}

async function getBooking(bookingId) {
  const booking = await bookingsModel.findById(bookingId)
  if (!booking) throw new Error('Booking not found')
  return booking
}

async function getUserBookings(userId) {
  return bookingsModel.findByUserId(userId)
}

async function getWorkerBookings(workerId) {
  return bookingsModel.findByUserId(workerId)
}

async function acceptBooking(bookingId, workerId) {
  const booking = await bookingsModel.findById(bookingId)
  if (!booking) throw new Error('Booking not found')
  if (booking.worker_id !== workerId) throw new Error('Not your booking')
  if (booking.status !== 'pending') throw new Error('Can only accept pending bookings')
  
  const updated = await bookingsModel.updateStatus(bookingId, 'accepted')
  
  const io = getIO()
  if (io) {
    io.to(`user:${booking.customer_id}`).emit('booking.accepted', updated)
  }
  
  return updated
}

async function rejectBooking(bookingId, workerId) {
  const booking = await bookingsModel.findById(bookingId)
  if (!booking) throw new Error('Booking not found')
  if (booking.worker_id !== workerId) throw new Error('Not your booking')
  return bookingsModel.updateStatus(bookingId, 'rejected')
}

async function updateBookingStatus(bookingId, workerId, status) {
  const booking = await bookingsModel.findById(bookingId)
  if (!booking) throw new Error('Booking not found')
  if (booking.worker_id !== workerId) throw new Error('Not your booking')
  
  const updated = await bookingsModel.updateStatus(bookingId, status)

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
  
  const io = getIO()
  if (io) {
    io.to(`user:${booking.customer_id}`).emit('booking.status.updated', updated)
    if (status === 'completed') {
      io.to(`user:${booking.customer_id}`).emit('booking.completed', updated)
    }
  }
  
  return updated
}

module.exports = { createBooking, getBooking, getUserBookings, getWorkerBookings, acceptBooking, rejectBooking, updateBookingStatus }