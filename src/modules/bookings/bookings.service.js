const bookingsModel = require('./bookings.model')
const paymentsService = require('../payments/payments.service')
const { getIO } = require('../realtime/socket')
const { pool } = require('../../config/database')
const chatModel = require('../chat/chat.model')
const notificationsService = require('../notification/notification.service')
const { getUserRoom } = require('../../utils/socketRooms')

// Standardized socket emitter
async function emitBookingEvent(event, booking, extra = {}) {
  const io = getIO()
  if (!io) return

  // Look up client_id for both parties so the event reaches the correct socket rooms
  const [customer, worker] = await Promise.all([
    pool.query(`SELECT client_id FROM users WHERE id = $1`, [booking.customer_id]),
    pool.query(`SELECT client_id FROM users WHERE id = $1`, [booking.worker_id]),
  ])

  const customerClientId = customer.rows[0]?.client_id || `U${booking.customer_id}`
  const workerClientId = worker.rows[0]?.client_id || `U${booking.worker_id}`
  const customerRoom = `user:${customerClientId}`
  const workerRoom = `user:${workerClientId}`

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
  io.to(customerRoom).emit(event, payload)
  io.to(workerRoom).emit(event, payload)

  // Emit to the booking room (admin can join)
  io.to(`booking:${booking.id}`).emit(event, payload)

  // Emit to admin room
  io.to('room:admin_all').emit(event, payload)
}

async function createBooking({ customerId, workerId, serviceName, jobSize, selectedServices = [] }) {
  // Verify worker exists and is online
  const workerResult = await pool.query(
    `SELECT id, is_online FROM users WHERE id = $1 AND role = 'worker'`,
    [workerId]
  );
  const worker = workerResult.rows[0];
  if (!worker) throw new Error('Worker not found');
  if (!worker.is_online) throw new Error('Worker is currently offline and cannot accept new bookings');

  let servicesSnapshot = null;
  let totalPrice = null;

  // If selected services are provided, validate and compute total
  if (selectedServices && selectedServices.length > 0) {
    const serviceIds = selectedServices.map(s => s.service_id);

    // Fetch worker's active services that match
    const svcResult = await pool.query(
      `SELECT ps.id AS service_id, ps.label, p.name AS profession_name, ws.price
       FROM worker_services ws
       JOIN profession_services ps ON ps.id = ws.service_id
       JOIN professions p ON p.id = ws.profession_id
       WHERE ws.worker_id = $1
         AND ws.is_active = true
         AND ps.is_active = true
         AND ws.service_id = ANY($2::int[])`,
      [workerId, serviceIds]
    );

    if (svcResult.rows.length !== serviceIds.length) {
      throw new Error('One or more selected services are inactive or unavailable');
    }

    // Build snapshot
    servicesSnapshot = svcResult.rows.map(row => ({
      service_id: row.service_id,
      label: row.label,
      profession_label: row.profession_name,
      price: parseFloat(row.price),
    }));

    // Compute total (server-authoritative)
    totalPrice = servicesSnapshot.reduce((sum, svc) => sum + svc.price, 0);
  }

  // Build the booking name from services or fall back to passed serviceName
  const computedServiceName = servicesSnapshot
    ? servicesSnapshot.map(s => s.label).join(' + ')
    : (serviceName || 'General Service');

  const booking = await bookingsModel.create({
    customerId,
    workerId,
    serviceName: computedServiceName,
    jobSize: jobSize || 'medium',
    servicesSnapshot,
    totalPrice,
  });

  emitBookingEvent('booking.created', booking);

  // Notify worker about new booking request
  try {
    await notificationsService.createNotification({
      userId: booking.worker_id,
      userRole: 'worker',
      type: 'booking_created',
      title: 'New booking request',
      message: `New booking #${booking.id} from client`,
      entityType: 'booking',
      entityId: booking.id,
      metadata: { booking_id: booking.id, customer_id: booking.customer_id },
    });
  } catch (err) {
    console.error('Notification creation failed (booking.created):', err);
  }

  return booking;
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

  // Notify customer that booking was accepted
  try {
    await notificationsService.createNotification({
      userId: booking.customer_id,
      userRole: 'customer',
      type: 'booking_accepted',
      title: 'Worker accepted your booking',
      message: `Booking #${booking.id} has been accepted`,
      entityType: 'booking',
      entityId: booking.id,
      metadata: { booking_id: booking.id, worker_id: booking.worker_id },
    })
  } catch (err) {
    console.error('Notification creation failed (booking.accepted):', err)
  }

  return updated
}

async function rejectBooking(bookingId, workerId) {
  const booking = await bookingsModel.findById(bookingId)
  if (!booking) throw new Error('Booking not found')
  if (booking.worker_id !== workerId) throw new Error('Not your booking')
  
  const updated = await bookingsModel.updateStatus(bookingId, 'rejected')
  
  emitBookingEvent('booking.rejected', updated)
  emitBookingEvent('booking.visibility.updated', updated, { visible: true })

  // Notify customer that booking was rejected
  try {
    await notificationsService.createNotification({
      userId: booking.customer_id,
      userRole: 'customer',
      type: 'booking_rejected',
      title: 'Worker rejected your booking',
      message: `Booking #${booking.id} was rejected`,
      entityType: 'booking',
      entityId: booking.id,
      metadata: { booking_id: booking.id, worker_id: booking.worker_id },
    })
  } catch (err) {
    console.error('Notification creation failed (booking.rejected):', err)
  }

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

    // ✅ Auto‑delete customer‑worker conversation when the job is done
    console.log(`🧹 Attempting to delete conversation for booking ${bookingId}`);
    try {
      const delResult = await pool.query(
        `DELETE FROM conversations WHERE booking_id = $1 AND conversation_type = 'customer_worker'`,
        [bookingId]
      );
      console.log(`🧹 Delete result: ${delResult.rowCount} row(s) deleted`);
    } catch (err) {
      console.error('Failed to delete conversation on complete:', err.message);
    }

    // ✅ Auto‑create payment record (idempotent)
    try {
      await paymentsService.ensurePaymentForCompletedBooking(updated)
    } catch (err) {
      console.error('Failed to create payment record on complete:', err.message)
    }
  }

  emitBookingEvent(`booking.${status}`, updated)

  // Create a notification only for the completed state (review reminder)
  if (status === 'completed') {
    try {
      await notificationsService.createNotification({
        userId: booking.customer_id,
        userRole: 'customer',
        type: 'booking_completed',
        title: `Job completed`,
        message: `Booking #${booking.id} has been completed. How was your experience?`,
        entityType: 'booking',
        entityId: booking.id,
        metadata: { booking_id: booking.id, status },
      })
    } catch (err) {
      console.error('Notification creation failed (completed):', err)
    }
  }

  return updated
}

// Customer cancels a booking (pending / accepted / onway)
// Customer cancels a booking (pending / accepted / onway)
async function cancelBooking(bookingId, userId, reason = null) {
  const booking = await bookingsModel.findById(bookingId)
  if (!booking) throw new Error('Booking not found')
  if (booking.customer_id !== userId) throw new Error('Not your booking')
  if (!['pending', 'accepted', 'onway'].includes(booking.status)) {
    throw new Error('Booking can only be cancelled while pending, accepted, or on the way')
  }

  const updated = await bookingsModel.updateStatus(bookingId, 'cancelled')

  // Record cancellation
  try {
    const cancellationModel = require('./cancellation.model')
    await cancellationModel.createCancellation({
      bookingId: booking.id,
      cancelledById: userId,
      cancelledByRole: 'customer',
      statusAtCancel: booking.status,
      workerId: booking.worker_id,
      reason: reason || null,
      bookingCreatedAt: booking.created_at,
    })
  } catch (err) {
    console.error('Failed to record cancellation:', err.message)
  }

  emitBookingEvent('booking.updated', updated, { previousStatus: booking.status })

  // Notify worker about the cancellation
  try {
    await notificationsService.createNotification({
      userId: booking.worker_id,
      userRole: 'worker',
      type: 'booking_cancelled',
      title: 'Booking cancelled by customer',
      message: `Booking #${booking.id} has been cancelled`,
      entityType: 'booking',
      entityId: booking.id,
      metadata: { booking_id: booking.id, reason: reason },
    })
  } catch (err) {
    console.error('Notification creation failed (booking.cancelled):', err)
  }

  return updated
}


module.exports = { createBooking, getBooking, getUserBookings, getWorkerBookings, acceptBooking, rejectBooking, updateBookingStatus, cancelBooking }