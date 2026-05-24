// Chat service — permission checks and message routing logic for customer, worker, and admin communication
const chatModel = require('./chat.model')
const authModel = require('../auth/auth.model')
const { pool } = require('../../config/database')   // ← moved from inside canMessage to top

// Checks if a sender is allowed to message a receiver based on roles and booking status
async function canMessage(senderId, receiverId, bookingId) {
  const sender = await authModel.findById(senderId)
  const receiver = await authModel.findById(receiverId)

  console.log('[SERVICE] sender role:', sender?.role, 'receiver role:', receiver?.role)

  if (!sender || !receiver) return false

  // ── Block suspended users from sending messages ──
  const senderStatus = await pool.query(
    `SELECT moderation_status FROM users WHERE id = $1`,
    [senderId]
  );
  if (senderStatus.rows[0]?.moderation_status === 'suspended') {
    return false;
  }

  // Admin can message anyone — support channel, but block if ticket is closed
  if (sender.role === 'admin' || receiver.role === 'admin') {
    // If a support conversation, check ticket status
    if (bookingId === 0 || bookingId === null) {
      // We don't have the conversation yet, but we can query later.
      // For now, we allow. The socket handler will check after conversation fetch.
      return true
    }
    return true
  }

  // Same role cannot message each other
  if (sender.role === receiver.role) return false

  // Customer and worker require an active booking in the allowed window
  if (!bookingId) return false

    const result = await pool.query(
    `SELECT * FROM bookings WHERE id = $1 AND status IN ('accepted', 'onway', 'working')`,
    [bookingId]
  )
  return result.rows.length > 0
}

// Sends a message after validating permissions and routes to the correct conversation
async function sendMessage(senderId, receiverId, text, bookingId = null) {
  const allowed = await canMessage(senderId, receiverId, bookingId)
  if (!allowed) throw new Error('Not allowed to message this user')

  const sender = await authModel.findById(senderId)
  const receiver = await authModel.findById(receiverId)

  let customerId, workerId
  if (receiver.role === 'admin' || sender.role === 'admin') {
    customerId = sender.role === 'admin' ? receiverId : senderId
    workerId = sender.role === 'admin' ? senderId : receiverId
    bookingId = 0
  } else if (sender.role === 'customer') {
    customerId = senderId
    workerId = receiverId
  } else {
    customerId = receiverId
    workerId = senderId
  }

  const conversationType = chatModel.resolveConversationType(sender.role, receiver.role)
  const conversation = await chatModel.findOrCreateConversation(customerId, workerId, bookingId, conversationType)

  const message = await chatModel.saveMessage(conversation.id, senderId, receiverId, text)

  // ── Auto‑assign admin to support ticket on first admin reply ──
  if (sender.role === 'admin' && (conversationType === 'customer_admin' || conversationType === 'worker_admin')) {
    try {
      const ticket = await require('../support/supportTicket.service').getTicketByConversation(conversation.id);
      if (ticket) {
        await require('../support/supportTicket.service').assignAdminIfNeeded(ticket.id, senderId);
      }
    } catch (err) {
      console.error('Auto-assign admin failed:', err.message);
    }
  }

  return message
}

module.exports = { canMessage, sendMessage }