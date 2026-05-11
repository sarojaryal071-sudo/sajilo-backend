const { pool } = require('../../config/database')

async function createChatTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id),
      worker_id INTEGER REFERENCES users(id),
      booking_id INTEGER,
      last_message TEXT,
      last_message_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id) NOT NULL,
      receiver_id INTEGER REFERENCES users(id) NOT NULL,
      text TEXT NOT NULL,
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

async function findOrCreateConversation(customerId, workerId, bookingId) {
  let result = await pool.query(
    `SELECT * FROM conversations WHERE customer_id = $1 AND worker_id = $2 AND booking_id = $3`,
    [customerId, workerId, bookingId]
  )
  if (result.rows.length > 0) return result.rows[0]

  result = await pool.query(
    `INSERT INTO conversations (customer_id, worker_id, booking_id) VALUES ($1, $2, $3) RETURNING *`,
    [customerId, workerId, bookingId]
  )
  return result.rows[0]
}

async function saveMessage(conversationId, senderId, receiverId, text) {
  const result = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, receiver_id, text) VALUES ($1, $2, $3, $4) RETURNING *`,
    [conversationId, senderId, receiverId, text]
  )
  await pool.query(
    `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
    [text, conversationId]
  )
  return result.rows[0]
}

async function getMessages(conversationId, limit = 50) {
  const result = await pool.query(
    `SELECT m.*, u.name as sender_name, u.role as sender_role 
     FROM messages m JOIN users u ON m.sender_id = u.id 
     WHERE m.conversation_id = $1 ORDER BY m.created_at DESC LIMIT $2`,
    [conversationId, limit]
  )
  return result.rows.reverse()
}

async function getUserConversations(userId) {
  // customer_worker conversations are only visible while the job is accepted or on‑the‑way.
  // Other conversation types (e.g. admin support) are always visible.
  const result = await pool.query(
    `SELECT c.*, 
      CASE WHEN c.customer_id = $1 THEN u2.name ELSE u1.name END as other_name,
      CASE WHEN c.customer_id = $1 THEN u2.role ELSE u1.role END as other_role,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND receiver_id = $1 AND read = false) as unread
     FROM conversations c
     JOIN users u1 ON c.customer_id = u1.id
     JOIN users u2 ON c.worker_id = u2.id
     LEFT JOIN bookings b ON c.booking_id = b.id AND c.conversation_type = 'customer_worker'
     WHERE (c.customer_id = $1 OR c.worker_id = $1)
       AND (c.conversation_type != 'customer_worker' OR b.status IN ('accepted', 'onway'))
     ORDER BY c.last_message_at DESC`,
    [userId]
  )
  return result.rows
}

async function markRead(conversationId, userId) {
  await pool.query(
    `UPDATE messages SET read = true WHERE conversation_id = $1 AND receiver_id = $2 AND read = false`,
    [conversationId, userId]
  )
}

async function create({ customerId, workerId, serviceName, jobSize, scheduledDate, urgency, price, servicesSnapshot = null, totalPrice = null }) {
  const result = await pool.query(
    `INSERT INTO bookings (customer_id, worker_id, service_name, job_size, status, schedule_date, schedule_time, price, services_snapshot, booking_total_price)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8::jsonb, $9)
     RETURNING *`,
    [customerId, workerId, serviceName, jobSize, scheduledDate, urgency || 'now', totalPrice != null ? totalPrice : (price || 0), servicesSnapshot ? JSON.stringify(servicesSnapshot) : null, totalPrice]
  )
  return result.rows[0]
}

async function findByWorkerId(workerId) {
  const result = await pool.query(
    `SELECT b.*, u.name as customer_name, u.email as customer_email, u.client_id as customer_client_id,
            r.rating as review_rating
     FROM bookings b
     JOIN users u ON b.customer_id = u.id
     LEFT JOIN reviews r ON r.booking_id = b.id
     WHERE b.worker_id = $1
     ORDER BY b.created_at DESC`,
    [workerId]
  )
  return result.rows
}

async function findByCustomerId(customerId) {
  const result = await pool.query(
    `SELECT b.*, u.name as worker_name, u.client_id as worker_client_id,
            CASE WHEN r.id IS NOT NULL THEN true ELSE false END as reviewed
     FROM bookings b 
     JOIN users u ON b.worker_id = u.id
     LEFT JOIN reviews r ON r.booking_id = b.id
     WHERE b.customer_id = $1
     ORDER BY b.created_at DESC`,
    [customerId]
  )
  return result.rows
}

async function findById(bookingId) {
  const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId])
  return result.rows[0] || null
}

async function updateStatus(bookingId, status) {
  const result = await pool.query(
    `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, bookingId]
  )
  return result.rows[0]
}

async function findActiveByWorkerId(workerId) {
  const result = await pool.query(
    `SELECT id FROM bookings WHERE worker_id = $1 AND status IN ('onway', 'working')`,
    [workerId]
  )
  return result.rows
}

module.exports = { createChatTables, findOrCreateConversation, saveMessage, getMessages, getUserConversations, markRead, create, findByWorkerId, findByCustomerId, findById, updateStatus, findActiveByWorkerId }