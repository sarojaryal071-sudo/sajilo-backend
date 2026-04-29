const { pool } = require('../../config/database')

async function createBookingsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES users(id),
      worker_id INTEGER NOT NULL,
      service_name VARCHAR(255) NOT NULL,
      job_size VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'onway', 'working', 'completed', 'cancelled')),
      schedule_date DATE,
      schedule_time VARCHAR(5),
      price INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
  await pool.query(query)
}

async function create({ customerId, workerId, serviceName, jobSize }) {
  const result = await pool.query(
    `INSERT INTO bookings (customer_id, worker_id, service_name, job_size, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [customerId, workerId, serviceName, jobSize]
  )
  return result.rows[0]
}

async function findById(id) {
  const result = await pool.query(
    `SELECT b.*, 
            c.name as customer_name, c.email as customer_email,
            w.name as worker_name, w.email as worker_email
     FROM bookings b
     JOIN users c ON b.customer_id = c.id
     JOIN users w ON b.worker_id = w.id
     WHERE b.id = $1`,
    [id]
  )
  return result.rows[0] || null
}

async function findByUserId(userId) {
  const result = await pool.query(
    `SELECT b.*, 
            c.name as customer_name,
            w.name as worker_name
     FROM bookings b
     JOIN users c ON b.customer_id = c.id
     JOIN users w ON b.worker_id = w.id
     WHERE b.customer_id = $1 OR b.worker_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  )
  return result.rows
}

async function updateStatus(id, status) {
  const result = await pool.query(
    `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  )
  return result.rows[0]
}

module.exports = { createBookingsTable, create, findById, findByUserId, updateStatus }