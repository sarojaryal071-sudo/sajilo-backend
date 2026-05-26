const jwt = require('jsonwebtoken')
const config = require('../../config/environment')
const { getUserRoom } = require('../../utils/socketRooms')

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

  io.on('connection', async (socket) => {
    const { id, role, client_id, role_id } = socket.user

    // Block suspended/terminated staff from connecting
    if (role_id) {
      const { pool } = require('../config/database');
      const profileResult = await pool.query(
        `SELECT status FROM staff_profiles WHERE user_id = $1`,
        [id]
      );
      const profileStatus = profileResult.rows[0]?.status;
      if (profileStatus === 'suspended' || profileStatus === 'terminated') {
        socket.emit('error', { message: 'Your account has been suspended or terminated.' });
        socket.disconnect(true);
        return;
      }
    }

    // ── Wrap all event listeners with correlation ID per event ──
    const { runWithCorrelationId } = require('../../services/audit.service');
    const { randomUUID } = require('crypto');
    const originalOn = socket.on.bind(socket);
    socket.on = (event, listener) => {
      originalOn(event, function(...args) {
        const correlationId = randomUUID();
        runWithCorrelationId(correlationId, () => listener.apply(this, args));
      });
    };

    const room = getUserRoom(id, client_id)
    const prefixedId = room.replace('user:', '')   // restore short identifier for logs and legacy
    console.log(`Socket connected: ${room} (${role})`)
    socket.join(room)

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
        const senderClientId = sender?.client_id || prefixedId
        const receiverRoom = getUserRoom(receiverId, receiver?.client_id)

        // Block sending on resolved/escalated support tickets
        if (sender.role === 'admin' || receiver.role === 'admin') {
          const cType = sender.role === 'admin'
            ? (receiver.role === 'customer' ? 'customer_admin' : 'worker_admin')
            : (sender.role === 'customer' ? 'customer_admin' : 'worker_admin')
          const custId = sender.role === 'admin' ? receiverId : id
          const workId = sender.role === 'admin' ? id : receiverId
          const { pool } = require('../config/database')
          const existingConv = await pool.query(
            `SELECT id FROM conversations WHERE customer_id = $1 AND worker_id = $2 AND conversation_type = $3`,
            [custId, workId, cType]
          )
          if (existingConv.rows.length > 0) {
            const ticket = await pool.query(
              `SELECT status FROM support_tickets WHERE conversation_id = $1 LIMIT 1`,
              [existingConv.rows[0].id]
            )
            if (ticket.rows.length > 0 && ['resolved', 'escalated'].includes(ticket.rows[0].status)) {
              socket.emit('message_error', { error: 'This support case has been resolved.' })
              return
            }
          }
        }

        const message = await chatService.sendMessage(id, receiverId, text, bookingId)
        const msg = {
          ...message,
          sender_name: sender?.name || 'Unknown',
          sender_role: sender?.role,
          sender_client_id: senderClientId
        }

        // Emit the message itself
        if (receiver?.role === 'admin') {
          io.to('room:admin_all').emit('new_message', msg)
        } else {
          io.to(receiverRoom).emit('new_message', msg)
        }
        socket.emit('message_sent', msg)

        // ── Emit conversation_updated so inbox lists update live ──
        const convDataForSender = {
          id: message.conversation_id,
          other_name: receiver?.name || 'Unknown',
          other_role: receiver?.role,
          booking_id: bookingId,
          last_message: text,
          last_message_at: new Date().toISOString(),
        }
        const convDataForReceiver = {
          id: message.conversation_id,
          other_name: sender?.name || 'Unknown',
          other_role: sender?.role,
          booking_id: bookingId,
          last_message: text,
          last_message_at: new Date().toISOString(),
        }

        io.to(`user:${senderClientId}`).emit('conversation_updated', convDataForSender)
        if (receiver?.role === 'admin') {
          io.to('room:admin_all').emit('conversation_updated', {
            ...convDataForReceiver,
            other_name: sender?.name || 'Unknown',
            other_role: sender?.role,
          })
        } else {
          io.to(receiverRoom).emit('conversation_updated', convDataForReceiver)
        }
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