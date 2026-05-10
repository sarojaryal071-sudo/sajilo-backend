const express = require('express');
const router = express.Router();
const paymentsController = require('./payments.controller');
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');

// Worker confirms invoice (unpaid → pending_cash)
router.put(
  '/booking/:bookingId/confirm-invoice',
  authGuard,
  roleGuard('worker'),
  paymentsController.confirmInvoice
);

// Worker marks cash payment as received (pending_cash → paid)
router.put(
  '/booking/:bookingId/mark-cash-paid',
  authGuard,
  roleGuard('worker'),
  paymentsController.markCashPaid
);

// Client confirms cash payment (pending_cash → paid)
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

module.exports = router;