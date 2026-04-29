const { Pool } = require('pg')
const config = require('./environment')

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
})

pool.on('error', (err) => {
  console.error('Database pool error:', err.message)
})

async function testConnection() {
  try {
    const client = await pool.connect()
    console.log('PostgreSQL connected successfully')
    client.release()
    return true
  } catch (err) {
    console.error('Database connection failed:', err.message)
    return false
  }
}

module.exports = { pool, testConnection }