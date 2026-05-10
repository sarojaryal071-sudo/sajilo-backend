const bookingsService = require('./bookings.service')

async function create(req, res, next) {
  try {
    const { workerId, serviceName, jobSize } = req.body
    const booking = await bookingsService.createBooking({
      customerId: req.user.id,
      workerId,
      serviceName,
      jobSize,
    })
    res.status(201).json({ success: true, data: booking })
  } catch (err) {
    next(err)
  }
}

async function getById(req, res, next) {
  try {
    const booking = await bookingsService.getBooking(req.params.id)
    res.json({ success: true, data: booking })
  } catch (err) {
    next(err)
  }
}

async function getMyBookings(req, res, next) {
  try {
    const bookings = await bookingsService.getUserBookings(req.user.id)
    res.json({ success: true, data: bookings })
  } catch (err) {
    next(err)
  }
}

async function getWorkerBookings(req, res, next) {
  try {
    const bookings = await bookingsService.getWorkerBookings(req.user.id)
    res.json({ success: true, data: bookings })
  } catch (err) { next(err) }
}

async function accept(req, res, next) {
  try {
    const booking = await bookingsService.acceptBooking(req.params.id, req.user.id)
    res.json({ success: true, data: booking })
  } catch (err) { next(err) }
}

async function reject(req, res, next) {
  try {
    const booking = await bookingsService.rejectBooking(req.params.id, req.user.id)
    res.json({ success: true, data: booking })
  } catch (err) { next(err) }
}

async function updateStatus(req, res, next) {
  try {
    const booking = await bookingsService.updateBookingStatus(req.params.id, req.user.id, req.body.status)
    res.json({ success: true, data: booking })
  } catch (err) { next(err) }
}

async function cancel(req, res, next) {
  try {
    const booking = await bookingsService.cancelBooking(req.params.id, req.user.id, req.body.reason || null)
    res.json({ success: true, data: booking })
  } catch (err) { next(err) }
}


module.exports = { create, getById, getMyBookings, getWorkerBookings, accept, reject, updateStatus, cancel }