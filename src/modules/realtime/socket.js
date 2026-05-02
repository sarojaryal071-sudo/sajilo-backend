const jwt = require('jsonwebtoken')
const config = require('../../config/environment')

let io = null

function initializeSocket(server) {
  const { Server } = require('socket.io')
  io = new Server(server, {
    cors: { origin: '*' },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('Authentication required'))
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret)
      socket.user = decoded
      next()
    } catch (err) {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: user ${socket.user.id} (${socket.user.role})`)

    socket.join(`user:${socket.user.id}`)
    socket.emit('connected', { userId: socket.user.id, role: socket.user.role })

    if (socket.user.role === 'worker') {
      socket.join('worker:active')
    }

    // Handles real-time chat messages — validates, saves to DB, and emits to receiver
    socket.on('send_message', async (data) => {
      console.log('[SEND_MSG]', socket.user.id, '→', data.receiverId)
      try {
        const { receiverId, text, bookingId } = data
        const chatService = require('../chat/chat.service')
        const authModel = require('../auth/auth.model')

        const sender = await authModel.findById(socket.user.id)
        const receiver = await authModel.findById(receiverId)
        console.log('[SOCKET] sending message with:', { senderId: socket.user.id, receiverId, bookingId })
        const message = await chatService.sendMessage(socket.user.id, receiverId, text, bookingId)

        const messageWithSender = {
          ...message,
          sender_name: sender.name,
          sender_role: sender.role,
        }

        io.to(`user:${receiverId}`).emit('new_message', messageWithSender)
        socket.emit('message_sent', messageWithSender)

        // Notify sender that a new conversation was created
        socket.emit('conversation_created', {
          id: message.conversation_id,
          last_message: text,
          last_message_at: new Date().toISOString(),
          other_name: receiver.name,
          other_role: receiver.role,
          unread: 0
        })

        const notifService = require('../notifications/notification.service')
        notifService.sendToUser(receiverId, {
          title: 'New message',
          message: `${sender.name}: ${text.slice(0, 50)}`,
          priority: 'normal',
        })
      } catch (err) {
        socket.emit('message_error', { error: err.message })
      }
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: user ${socket.user.id}`)
    })
  })

  console.log('Socket.io initialized with JWT auth + chat')
}

function getIO() {
  return io
}

module.exports = { initializeSocket, getIO }