const http = require('http')
const app = require('./src/app')
const { testConnection } = require('./src/config/database')
const { initializeSocket } = require('./src/modules/realtime/socket')
const config = require('./src/config/environment')

const server = http.createServer(app)

initializeSocket(server)

async function start() {
  const dbConnected = await testConnection()
  if (!dbConnected) {
  console.error('WARNING: DB not connected, continuing server...')
}

  server.listen(config.port, () => {
    console.log(`Sajilo server running on port ${config.port}`)
    console.log(`Environment: ${config.nodeEnv}`)
  })
}

start()