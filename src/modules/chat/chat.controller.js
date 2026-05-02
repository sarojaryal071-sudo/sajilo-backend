// Chat controller — REST API handlers for sending messages and loading conversation data
const chatService = require('./chat.service')
const chatModel = require('./chat.model')

// Sends a message from the authenticated user to a receiver — emits via socket if available
async function sendMessage(req, res, next) {
  try {
    const { receiverId, text, bookingId } = req.body
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

module.exports = { sendMessage, getConversations, getMessages }