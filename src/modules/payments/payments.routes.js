const express = require('express');
const router = express.Router();
const paymentsController = require('./payments.controller');
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');

// Worker confirms invoice (unpaid → pending_cash / awaiting_*)
router.put(
  '/booking/:bookingId/confirm-invoice',
  authGuard,
  roleGuard('worker'),
  paymentsController.confirmInvoice
);

// Worker confirms digital payment receipt
router.put(
  '/booking/:bookingId/confirm-digital',
  authGuard,
  roleGuard('customer'),
  paymentsController.confirmDigital
);

// Worker marks cash payment as received (awaiting_cash_confirmation → paid)
router.put(
  '/booking/:bookingId/mark-cash-paid',
  authGuard,
  roleGuard('worker'),
  paymentsController.markCashPaid
);

// Client initiates digital payment (unpaid → awaiting_digital_confirmation)
router.put(
  '/booking/:bookingId/initiate-digital',
  authGuard,
  roleGuard('customer'),
  paymentsController.initiateDigitalPayment
);

// Client confirms cash payment (pending_cash / awaiting_cash_confirmation → paid)
router.put(
  '/booking/:bookingId/confirm',
  authGuard,
  roleGuard('customer'),
  paymentsController.confirmCash
);

// Get payment record for a booking (any authenticated user)
router.get(
  '/booking/:bookingId',
  authGuard,
  paymentsController.getByBooking
);

// Get all payments for a worker (worker only)
router.get(
  '/worker/:workerId',
  authGuard,
  roleGuard('worker'),
  paymentsController.getWorkerPayments
);

// Get all payments for a customer (customer only)
router.get(
  '/customer/:customerId',
  authGuard,
  roleGuard('customer'),
  paymentsController.getCustomerPayments
);

// Client records cash payment intent (no status change)
router.post(
  '/booking/:bookingId/initiate-cash-payment',
  authGuard,
  paymentsController.initiateCashPayment
);

// Get payment timeline for a booking (read-only)
router.get(
  '/booking/:bookingId/timeline',
  authGuard,
  async (req, res, next) => {
    try {
      const { getBookingPaymentTimeline } = require('./paymentTimeline.service');
      const events = await getBookingPaymentTimeline(Number(req.params.bookingId));
      return res.json({ success: true, data: events });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;