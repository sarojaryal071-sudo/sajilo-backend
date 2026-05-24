// Chat controller — REST API handlers for sending messages and loading conversation data
const chatService = require('./chat.service')
const chatModel = require('./chat.model')
const { pool } = require('../../config/database');

// Sends a message from the authenticated user to a receiver — emits via socket if available
async function sendMessage(req, res, next) {
  try {
    const { receiverId, text, bookingId } = req.body
    // Block sending on resolved/escalated support tickets
    if (req.user.role === 'admin' || req.user.role === 'admin') { // admin or the other party could be admin
      const conversationType = req.user.role === 'admin'
        ? (req.body.receiverRole === 'customer' ? 'customer_admin' : 'worker_admin')
        : (req.user.role === 'customer' ? 'customer_admin' : 'worker_admin');
      const { pool } = require('../../config/database');
      const existingConv = await pool.query(
        `SELECT id FROM conversations WHERE customer_id = $1 AND worker_id = $2 AND conversation_type = $3`,
        [req.user.role === 'admin' ? receiverId : req.user.id, req.user.role === 'admin' ? req.user.id : receiverId, conversationType]
      );
      if (existingConv.rows.length > 0) {
        const ticket = await pool.query(`SELECT status FROM support_tickets WHERE conversation_id = $1 LIMIT 1`, [existingConv.rows[0].id]);
        if (ticket.rows.length > 0 && ['resolved', 'escalated'].includes(ticket.rows[0].status)) {
          return res.status(400).json({ success: false, error: 'This support case has been resolved.' });
        }
      }
    }

    const message = await chatService.sendMessage(req.user.id, receiverId, text, bookingId)

    const { getIO } = require('../realtime/socket')
    const io = getIO()
    if (io) {
      io.to(`user:${receiverId}`).emit('new_message', message)
    }

    res.json({ success: true, data: message })
  } catch (err) {
    next(err)
  }
}

// Returns all conversations for the authenticated user
async function getConversations(req, res, next) {
  try {
    const conversations = await chatModel.getUserConversations(req.user.id)
    res.json({ success: true, data: conversations })
  } catch (err) {
    next(err)
  }
}

// Returns messages for a specific conversation and marks them as read
async function getMessages(req, res, next) {
  try {
    const messages = await chatModel.getMessages(req.params.conversationId)
    await chatModel.markRead(req.params.conversationId, req.user.id)
    res.json({ success: true, data: messages })
  } catch (err) {
    next(err)
  }
}

async function deleteConversation(req, res, next) {
  try {
    const conversationId = Number(req.params.id);
    const userId = req.user.id;
    const role = req.user.role;

    // Fetch user's role
    let deleteColumn;
    if (role === 'customer') deleteColumn = 'customer_deleted';
    else if (role === 'worker') deleteColumn = 'worker_deleted';
    else deleteColumn = 'admin_deleted';

    await pool.query(
      `UPDATE conversations SET ${deleteColumn} = TRUE WHERE id = $1`,
      [conversationId]
    );

    res.json({ success: true, message: 'Conversation deleted from your inbox' });
  } catch (err) {
    next(err);
  }
}

async function getTimeline(req, res, next) {
  try {
    const timeline = await chatModel.getConversationTimeline(req.params.conversationId);
    res.json({ success: true, data: timeline });
  } catch (err) {
    next(err);
  }
}

module.exports = { sendMessage, getConversations, getMessages, deleteConversation, getTimeline };;