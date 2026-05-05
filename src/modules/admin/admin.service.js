const { pool } = require('../../config/database')
const { generateClientId } = require('../../utils/clientIdGenerator')
const { getIO } = require('../realtime/socket')

async function getAllWorkers(statusFilter) {
  let query = `
    SELECT 
      u.id, u.email, u.role, u.name, u.phone, u.status, 
      u.client_id, u.display_id, u.skills, u.is_online, 
      u.completed_jobs, u.created_at,
      COALESCE(u.primary_skill, wa.primary_role) AS primary_skill
    FROM users u
    LEFT JOIN worker_applications wa ON wa.user_id = u.id
    WHERE u.role = 'worker'
  `
  const params = []

  if (statusFilter) {
    query += ` AND u.status = ANY($1)`
    params.push(statusFilter.split(','))
  }

  query += ` ORDER BY u.created_at DESC`

  const result = await pool.query(query, params)
  return result.rows
}

async function approveWorker(id) {
  // Fetch worker application to get the true primary role
  const appResult = await pool.query(
    `SELECT primary_role FROM worker_applications WHERE user_id = $1`,
    [id]
  )
  const primaryRole = appResult.rows[0]?.primary_role || null

  const { getProfessionCode } = require('../config/workerCategories')
  const professionCode = primaryRole ? getProfessionCode(primaryRole) : 'WK'

  // Get the worker's current display_id BEFORE update (to emit to their socket room)
  const userBefore = await pool.query(
    `SELECT display_id FROM users WHERE id = $1`,
    [id]
  )
  const oldDisplayId = userBefore.rows[0]?.display_id

  // Update user's primary_skill
  await pool.query(`UPDATE users SET primary_skill = $1 WHERE id = $2`, [primaryRole, id])

  // Generate new worker display ID
  const { approveWorkerDisplayId } = require('../auth/auth.model')
  const newDisplayId = await approveWorkerDisplayId(id, professionCode)

  // Final approval update
  const result = await pool.query(
    `UPDATE users SET status = 'active', display_id = $2, updated_at = NOW() WHERE id = $1 AND role = 'worker' RETURNING id, email, name, status, display_id`,
    [id, newDisplayId]
  )

  // 🔥 Emit real‑time event to the worker's pending screen
  const io = getIO()
  if (io && oldDisplayId) {
    io.to(`user:${oldDisplayId}`).emit('worker:approved', {
      status: 'active',
      display_id: newDisplayId,
      userId: id,
    })
  }

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