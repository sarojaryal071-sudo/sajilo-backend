const bookingsService = require('./bookings.service');
const { logAuditEvent } = require('../../services/audit.service');

async function create(req, res, next) {
  try {
    const { workerId, serviceName, jobSize, selectedServices } = req.body;

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

    const booking = await bookingsService.createBooking({
      customerId: req.user.id,
      workerId,
      serviceName: serviceName.trim(),
      jobSize: jobSize || 'medium',
      selectedServices: selectedServices || [],
    });

    // Audit booking created
    try {
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: 'booking.created',
        entityType: 'booking',
        entityId: booking.id,
        entityDisplay: `Booking #${booking.id}`,
        summary: `Booking #${booking.id} created by customer`,
        severity: 'low',
        category: 'bookings',
        outcome: 'success',
        newValues: {
          service_name: booking.service_name,
          worker_id: workerId,
          status: booking.status,
        },
      });
    } catch (auditErr) {
      console.error('Audit write failed (booking created):', auditErr);
    }

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const booking = await bookingsService.getBooking(req.params.id);
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
}

async function getMyBookings(req, res, next) {
  try {
    const bookings = await bookingsService.getUserBookings(req.user.id);
    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
}

async function getWorkerBookings(req, res, next) {
  try {
    const bookings = await bookingsService.getWorkerBookings(req.user.id);
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
}

async function accept(req, res, next) {
  try {
    const booking = await bookingsService.acceptBooking(req.params.id, req.user.id);
    try {
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: 'booking.accepted',
        entityType: 'booking',
        entityId: booking.id,
        entityDisplay: `Booking #${booking.id}`,
        summary: `Booking #${booking.id} accepted by worker`,
        severity: 'low',
        category: 'bookings',
        outcome: 'success',
        oldValues: { status: 'pending' },
        newValues: { status: booking.status },
      });
    } catch (auditErr) { console.error('Audit write failed (booking accepted):', auditErr); }
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
}

async function reject(req, res, next) {
  try {
    const booking = await bookingsService.rejectBooking(req.params.id, req.user.id);
    try {
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: 'booking.rejected',
        entityType: 'booking',
        entityId: booking.id,
        entityDisplay: `Booking #${booking.id}`,
        summary: `Booking #${booking.id} rejected by worker`,
        severity: 'low',
        category: 'bookings',
        outcome: 'success',
        oldValues: { status: 'pending' },
        newValues: { status: booking.status },
      });
    } catch (auditErr) { console.error('Audit write failed (booking rejected):', auditErr); }
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const booking = await bookingsService.updateBookingStatus(req.params.id, req.user.id, req.body.status);
    try {
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: `booking.status_changed`,
        entityType: 'booking',
        entityId: booking.id,
        entityDisplay: `Booking #${booking.id}`,
        summary: `Booking #${booking.id} status changed to ${req.body.status}`,
        severity: 'low',
        category: 'bookings',
        outcome: 'success',
        oldValues: { status: booking.previous_status || 'unknown' },
        newValues: { status: req.body.status },
      });
    } catch (auditErr) { console.error('Audit write failed (booking status):', auditErr); }
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
}

async function cancel(req, res, next) {
  try {
    const booking = await bookingsService.cancelBooking(req.params.id, req.user.id, req.body.reason || null);
    try {
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: 'booking.cancelled',
        entityType: 'booking',
        entityId: booking.id,
        entityDisplay: `Booking #${booking.id}`,
        summary: `Booking #${booking.id} cancelled by customer`,
        severity: 'medium',
        category: 'bookings',
        outcome: 'success',
        reason: req.body.reason || null,
        oldValues: { status: booking.previous_status || 'unknown' },
        newValues: { status: 'cancelled' },
      });
    } catch (auditErr) { console.error('Audit write failed (booking cancelled):', auditErr); }
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
}

module.exports = { create, getById, getMyBookings, getWorkerBookings, accept, reject, updateStatus, cancel };