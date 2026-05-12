const bookingsService = require('./bookings.service')

async function create(req, res, next) {
  try {
    const { workerId, serviceName, jobSize, selectedServices } = req.body;

    // ── Validation hardening (Phase 13A) ──
    if (!Number.isInteger(workerId) || workerId < 1) {
      return res.status(400).json({ error: 'Invalid workerId – must be a positive integer' });
    }
    if (typeof serviceName !== 'string' || serviceName.trim().length === 0) {
      return res.status(400).json({ error: 'serviceName is required and must be a non‑empty string' });
    }
    const allowedSizes = ['small', 'medium', 'large'];
    if (jobSize && !allowedSizes.includes(jobSize)) {
      return res.status(400).json({ error: `jobSize must be one of ${allowedSizes.join(', ')}` });
    }
    if (selectedServices !== undefined && !Array.isArray(selectedServices)) {
      return res.status(400).json({ error: 'selectedServices must be an array' });
    }
    // ─────────────────────────────────────

    const booking = await bookingsService.createBooking({
      customerId: req.user.id,
      workerId,
      serviceName: serviceName.trim(),
      jobSize: jobSize || 'medium',
      selectedServices: selectedServices || [],
    });
    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    next(err);
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