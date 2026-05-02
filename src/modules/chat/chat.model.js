// Chat model — PostgreSQL database tables and queries for conversations and messages
const { pool } = require('../../config/database')

// Creates the conversations and messages tables if they don't exist
async function createChatTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id),
      worker_id INTEGER REFERENCES users(id),
      booking_id INTEGER,
      conversation_type TEXT NOT NULL DEFAULT 'customer_admin',
      context_id INTEGER,
      last_message TEXT,
      last_message_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_type TEXT NOT NULL DEFAULT 'customer_admin'`);
  await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS context_id INTEGER`);
await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal'`);
await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open'`);
await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS support_ticket_id INTEGER`);


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

// Finds an existing conversation or creates a new one between customer and worker
async function findOrCreateConversation(customerId, workerId, bookingId, conversationType = 'customer_admin') {
  let result = await pool.query(
    `SELECT * FROM conversations WHERE customer_id = $1 AND worker_id = $2 AND booking_id = $3 AND conversation_type = $4`,
    [customerId, workerId, bookingId || 0, conversationType]
  )
  if (result.rows.length > 0) return result.rows[0]

  result = await pool.query(
    `INSERT INTO conversations (customer_id, worker_id, booking_id, conversation_type) VALUES ($1, $2, COALESCE($3, 0), $4) RETURNING *`,
    [customerId, workerId, bookingId, conversationType]
  )
  return result.rows[0]
}

// Saves a new message and updates the conversation's last message
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

// Retrieves messages for a conversation — newest first, then reversed for chronological order
async function getMessages(conversationId, limit = 50) {
  const result = await pool.query(
    `SELECT m.*, u.name as sender_name, u.role as sender_role 
     FROM messages m JOIN users u ON m.sender_id = u.id 
     WHERE m.conversation_id = $1 ORDER BY m.created_at DESC LIMIT $2`,
    [conversationId, limit]
  )
  return result.rows.reverse()
}

// Gets all conversations for a user with unread count
async function getUserConversations(userId) {
  const result = await pool.query(
    `SELECT c.*, 
      CASE WHEN c.customer_id = $1 THEN u2.name ELSE u1.name END as other_name,
      CASE WHEN c.customer_id = $1 THEN c.worker_id ELSE c.customer_id END as other_id,
      CASE WHEN c.customer_id = $1 THEN u2.role ELSE u1.role END as other_role,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND receiver_id = $1 AND read = false) as unread
     FROM conversations c
     JOIN users u1 ON c.customer_id = u1.id
     JOIN users u2 ON c.worker_id = u2.id
     WHERE c.customer_id = $1 OR c.worker_id = $1
     ORDER BY c.last_message_at DESC`,
    [userId]
  )
  return result.rows
}

// Marks all unread messages in a conversation as read for a user
async function markRead(conversationId, userId) {
  await pool.query(
    `UPDATE messages SET read = true WHERE conversation_id = $1 AND receiver_id = $2 AND read = false`,
    [conversationId, userId]
  )
}

// Resolves conversation type from sender and receiver roles
function resolveConversationType(senderRole, receiverRole) {
  if (senderRole === 'customer' && receiverRole === 'admin') return 'customer_admin'
  if (senderRole === 'worker' && receiverRole === 'admin') return 'worker_admin'
  if (senderRole === 'admin' && receiverRole === 'customer') return 'customer_admin'
  if (senderRole === 'admin' && receiverRole === 'worker') return 'worker_admin'
  if (senderRole === 'customer' && receiverRole === 'worker') return 'customer_worker'
  if (senderRole === 'worker' && receiverRole === 'customer') return 'customer_worker'
  return 'system'
}

module.exports = { createChatTables, resolveConversationType, findOrCreateConversation, saveMessage, getMessages, getUserConversations, markRead }