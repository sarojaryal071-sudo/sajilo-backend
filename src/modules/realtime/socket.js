const jwt = require('jsonwebtoken')
const config = require('../../config/environment')

let io = null
let chatService = null
let authModel = null

function initializeSocket(server) {
  const { Server } = require('socket.io')
  io = new Server(server, { cors: { origin: '*' } })

  // Load dependencies
  chatService = require('../chat/chat.service')
  authModel = require('../auth/auth.model')

  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const decoded = jwt.verify(token, config.jwt.secret)
      socket.user = decoded
      next()
    } catch (err) {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const { id, role, display_id } = socket.user
    const prefixedId = display_id || `${role === 'customer' ? 'C' : role === 'worker' ? 'W' : 'A'}${String(id).padStart(4, '0')}`
    console.log(`Socket connected: ${prefixedId} (${role})`)
    socket.join(`user:${prefixedId}`)
        // Join booking-specific rooms
    socket.on('join_booking', (bookingId) => {
      socket.join(`booking:${bookingId}`)
    })
    
    socket.emit('connected', { userId: prefixedId, role })
    if (role === 'admin') { socket.join('room:admin_all') }
    if (role === 'worker') { socket.join('worker:active') }

    socket.on('send_message', async (data) => {
      console.log('[SEND_MSG]', prefixedId, '→', data.receiverId)
      try {
        const { receiverId, text, bookingId } = data
        const sender = await authModel.findById(id)
        const receiver = await authModel.findById(receiverId)
        const senderDisplayId = sender?.display_id || prefixedId
        const receiverDisplayId = receiver?.display_id || receiverId
        const message = await chatService.sendMessage(id, receiverId, text, bookingId)
        const msg = { ...message, sender_name: sender?.name || 'Unknown', sender_role: sender?.role, sender_display_id: senderDisplayId }
        if (receiver?.role === 'admin') { io.to('room:admin_all').emit('new_message', msg) }
        else { io.to(`user:${receiverDisplayId}`).emit('new_message', msg) }
        socket.emit('message_sent', msg)
      } catch (err) {
        console.error('[SEND_MSG] Error:', err.message)
        socket.emit('message_error', { error: err.message })
      }
    })

    socket.on('disconnect', () => console.log(`Socket disconnected: ${prefixedId}`))
  })
}

function getIO() { return io }
module.exports = { initializeSocket, getIO }