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

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: user ${socket.user.id}`)
    })
  })

  console.log('Socket.io initialized with JWT auth')
}

function getIO() {
  return io
}

module.exports = { initializeSocket, getIO }