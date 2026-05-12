// sajilo-backend/src/modules/support/supportTickets.routes.js
const express = require('express');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');
const ticketsController = require('./supportTickets.controller');

// ── User‑facing router (worker / customer) ──
const userRouter = express.Router();
userRouter.post('/', authGuard, ticketsController.createTicket);

// ── Admin‑facing router ──
const adminRouter = express.Router();
adminRouter.get('/', authGuard, permissionGuard('manage_tickets'), ticketsController.getTickets);
adminRouter.put('/:id', authGuard, permissionGuard('manage_tickets'), ticketsController.updateTicket);

module.exports = { userRouter, adminRouter };