// sajilo-backend/src/modules/admin/admin.simulate.routes.js
const express = require('express');
const router = express.Router();
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');
const bookingsService = require('../bookings/bookings.service');
const paymentsService = require('../payments/payments.service');
const notificationsService = require('../notification/notification.service');
const { pool } = require('../../config/database');

// ── All endpoints are admin‑only ─────────────────────────────────
router.use(authGuard, roleGuard('admin'));

// POST /api/admin/simulate/booking
router.post('/booking', async (req, res) => {
  try {
    const { customerId, workerId, serviceName = 'Simulated Service', jobSize = 'medium' } = req.body;
    if (!customerId || !workerId) {
      return res.status(400).json({ error: 'customerId and workerId are required' });
    }
    const booking = await bookingsService.createBooking({
      customerId,
      workerId,
      serviceName,
      jobSize,
      selectedServices: [],
    });
    return res.status(201).json({ success: true, data: booking });
  } catch (err) {
    console.error('simulate booking error:', err);
    return res.status(400).json({ error: err.message || 'Simulation failed' });
  }
});

// POST /api/admin/simulate/accept
router.post('/accept', async (req, res) => {
  try {
    const { bookingId, workerId } = req.body;
    if (!bookingId || !workerId) {
      return res.status(400).json({ error: 'bookingId and workerId are required' });
    }
    const updated = await bookingsService.acceptBooking(bookingId, workerId);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('simulate accept error:', err);
    return res.status(400).json({ error: err.message || 'Simulation failed' });
  }
});

// POST /api/admin/simulate/complete
router.post('/complete', async (req, res) => {
  try {
    const { bookingId, workerId } = req.body;
    if (!bookingId || !workerId) {
      return res.status(400).json({ error: 'bookingId and workerId are required' });
    }
    const updated = await bookingsService.updateBookingStatus(bookingId, workerId, 'completed');
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('simulate complete error:', err);
    return res.status(400).json({ error: err.message || 'Simulation failed' });
  }
});

// POST /api/admin/simulate/cancel
router.post('/cancel', async (req, res) => {
  try {
    const { bookingId, customerId, reason = 'Admin simulation cancellation' } = req.body;
    if (!bookingId || !customerId) {
      return res.status(400).json({ error: 'bookingId and customerId are required' });
    }
    const updated = await bookingsService.cancelBooking(bookingId, customerId, reason);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('simulate cancel error:', err);
    return res.status(400).json({ error: err.message || 'Simulation failed' });
  }
});

// POST /api/admin/simulate/payment
router.post('/payment', async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    // Fetch the booking
    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    const booking = bookingResult.rows[0];
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Ensure a payment row exists
    let payment = await paymentsService.getPaymentByBookingId(bookingId);
    if (!payment) {
      payment = await paymentsService.ensurePaymentForCompletedBooking(booking);
    }

    // Confirm invoice (as worker)
    const updated = await paymentsService.confirmInvoiceWithEdits(
      bookingId,
      booking.worker_id,
      { discount_amount: 0, extra_items: [], payment_method: 'cash' }
    );

    // Mark cash paid (as customer)
    const paid = await paymentsService.confirmCashPayment(bookingId, booking.customer_id);

    return res.json({ success: true, data: paid });
  } catch (err) {
    console.error('simulate payment error:', err);
    return res.status(400).json({ error: err.message || 'Simulation failed' });
  }
});

// POST /api/admin/simulate/notification
router.post('/notification', async (req, res) => {
  try {
    const { userId, userRole, type, title, message, entityType, entityId, metadata } = req.body;
    if (!userId || !userRole || !type || !title) {
      return res.status(400).json({ error: 'userId, userRole, type, and title are required' });
    }
    const notification = await notificationsService.createNotification({
      userId,
      userRole,
      type,
      title,
      message: message || '',
      entityType: entityType || 'system',
      entityId: entityId || null,
      metadata: metadata || {},
    });
    return res.status(201).json({ success: true, data: notification });
  } catch (err) {
    console.error('simulate notification error:', err);
    return res.status(400).json({ error: err.message || 'Simulation failed' });
  }
});

module.exports = router;