// sajilo-backend/src/services/workflows/workflowOrchestrator.service.js
const { pool } = require('../../config/database');
const paymentsService = require('../../modules/payments/payments.service');
const notificationsService = require('../../modules/notification/notification.service');

async function onBookingCompleted(booking, workerId) {
  // 1. Update worker earnings (critical)
  await pool.query(
    `UPDATE users SET total_earnings = total_earnings + $1, completed_jobs = completed_jobs + 1, updated_at = NOW() WHERE id = $2`,
    [booking.price || 0, workerId]
  );

  // 2. Delete conversation (non‑critical)
  try {
    await pool.query(
      `DELETE FROM conversations WHERE booking_id = $1 AND conversation_type = 'customer_worker'`,
      [booking.id]
    );
  } catch (err) {
    console.error('Orchestrator: conversation deletion failed:', err.message);
  }

  // 3. Ensure payment record (non‑critical)
  try {
    await paymentsService.ensurePaymentForCompletedBooking(booking);
  } catch (err) {
    console.error('Orchestrator: payment creation failed:', err.message);
  }

  // 4. Review notification (non‑critical)
  try {
    await notificationsService.createNotification({
      userId: booking.customer_id,
      userRole: 'customer',
      type: 'booking_completed',
      title: 'Job completed',
      message: `Booking #${booking.id} has been completed. How was your experience?`,
      entityType: 'booking',
      entityId: booking.id,
      metadata: { booking_id: booking.id, status: 'completed' },
    });
  } catch (err) {
    console.error('Orchestrator: notification failed:', err.message);
  }
}

module.exports = { onBookingCompleted };