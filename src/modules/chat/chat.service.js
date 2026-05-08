// Chat service — permission checks and message routing logic for customer, worker, and admin communication
const chatModel = require('./chat.model')
const authModel = require('../auth/auth.model')

// Checks if a sender is allowed to message a receiver based on roles and booking status
async function canMessage(senderId, receiverId, bookingId) {
  const sender = await authModel.findById(senderId)
  const receiver = await authModel.findById(receiverId)

    console.log('[SERVICE] sender role:', sender?.role, 'receiver role:', receiver?.role)

  if (!sender || !receiver) return false

  // Admin can message anyone — support channel
  if (sender.role === 'admin' || receiver.role === 'admin') return true

  // Same role cannot message each other
  if (sender.role === receiver.role) return false

  // Customer and worker require an active booking in the allowed window
  if (!bookingId) return false

  const { pool } = require('../../config/database')
  const result = await pool.query(
    `SELECT * FROM bookings WHERE id = $1 AND status IN ('accepted', 'onway')`,
    [bookingId]
  )
  return result.rows.length > 0
}

// Sends a message after validating permissions and routes to the correct conversation
async function sendMessage(senderId, receiverId, text, bookingId = null) {
  const allowed = await canMessage(senderId, receiverId, bookingId)
  if (!allowed) throw new Error('Not allowed to message this user')

    console.log('[SERVICE] sendMessage called with:', { senderId, receiverId, text, bookingId })

  const sender = await authModel.findById(senderId)
  const receiver = await authModel.findById(receiverId)

  // Determine customer and worker IDs for conversation grouping
  let customerId, workerId
  if (receiver.role === 'admin' || sender.role === 'admin') {
    // Group all admin conversations per customer — same customer always reuses same conversation
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
console.log('[SERVICE] conversation returned:', { id: conversation?.id, type: conversation?.conversation_type, customerId, workerId })
console.log('[SERVICE] conversation.id used for save:', conversation?.id)
return chatModel.saveMessage(conversation.id, senderId, receiverId, text)
}

module.exports = { canMessage, sendMessage }