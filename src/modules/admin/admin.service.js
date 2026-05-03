const { pool } = require('../../config/database')
const { generateClientId } = require('../../utils/clientIdGenerator')

async function getAllWorkers() {
  const result = await pool.query(
    `SELECT id, email, role, name, phone, status, client_id, skills, is_online, completed_jobs, created_at 
     FROM users WHERE role = 'worker' ORDER BY created_at DESC`
  )
  return result.rows
}

async function approveWorker(id) {
  // Get worker info first for profession
  const worker = await pool.query(
    `SELECT id, skills FROM users WHERE id = $1 AND role = 'worker'`, [id]
  )
  if (!worker.rows[0]) throw new Error('Worker not found')

  const profession = worker.rows[0].skills?.[0] || null

  // Generate new client ID for approved worker
  const clientId = await generateClientId('worker', 'active', profession)

  // Update status and client ID
  const result = await pool.query(
    `UPDATE users SET status = 'active', client_id = $2, updated_at = NOW() WHERE id = $1 AND role = 'worker' RETURNING id, email, name, status, client_id`,
    [id, clientId]
  )
  return result.rows[0]
}

async function rejectWorker(id) {
  const result = await pool.query(
    `UPDATE users SET status = 'rejected', updated_at = NOW() WHERE id = $1 AND role = 'worker' RETURNING id, email, name, status`,
    [id]
  )
  if (!result.rows[0]) throw new Error('Worker not found')
  return result.rows[0]
}

async function getStats() {
  const workers = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'worker'`)
  const bookings = await pool.query(`SELECT COUNT(*) FROM bookings`)
  const users = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'customer'`)
  
  return {
    totalWorkers: parseInt(workers.rows[0].count),
    totalBookings: parseInt(bookings.rows[0].count),
    totalUsers: parseInt(users.rows[0].count),
  }
}

module.exports = { getAllWorkers, approveWorker, rejectWorker, getStats }