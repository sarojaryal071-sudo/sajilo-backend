const supportTicketService = require('./supportTicket.service');

async function createTicket(req, res, next) {
  try {
    const { conversationId, category, priority } = req.body;
    if (!conversationId) return res.status(400).json({ success: false, error: 'conversationId required' });
    const ticket = await supportTicketService.createTicket(conversationId, req.user.id, category, priority);
    res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
}

async function getTicketByConversation(req, res, next) {
  try {
    const ticket = await supportTicketService.getTicketByConversation(Number(req.params.conversationId));
    res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
}

async function getAllTickets(req, res, next) {
  try {
    const tickets = await supportTicketService.getAllTickets();
    res.json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
}

async function startSupportSession(req, res, next) {
  try {
    const { category, priority } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Create a conversation with admin
    const chatService = require('../chat/chat.service');
    const chatModel = require('../chat/chat.model');

    // Admin ID – use the same logic as existing support routes
    const adminResult = await require('../../config/database').pool.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );
    if (adminResult.rows.length === 0) {
      return res.status(500).json({ success: false, error: 'No admin available' });
    }
    const adminId = adminResult.rows[0].id;

    // Determine customerId/workerId for conversation grouping
    let customerId, workerId;
    if (userRole === 'customer') {
      customerId = userId;
      workerId = adminId;
    } else {
      customerId = adminId;
      workerId = userId;
    }

    const conversationType = userRole === 'customer' ? 'customer_admin' : 'worker_admin';
    const conversation = await chatModel.findOrCreateConversation(
      customerId, workerId, null, conversationType
    );

    // 2. Create the support ticket
    const ticket = await supportTicketService.createTicket(
      conversation.id,
      userId,
      category || 'other',
      priority || 'normal'
    );

    res.json({ success: true, data: { conversation, ticket } });
  } catch (err) {
    next(err);
  }
}

module.exports = { createTicket, getTicketByConversation, getAllTickets, startSupportSession };