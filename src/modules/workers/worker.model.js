/*
 * Worker Model — database queries for worker profiles
 */
const { pool } = require('../../config/database')

async function findById(id) {
  const result = await pool.query(
    `SELECT id, client_id, name, email, phone, photo_url, skills, 
            bio, hourly_rate, is_online, verification_status, status,
            total_earnings, completed_jobs, created_at
     FROM users WHERE id = $1 AND role = 'worker'`,
    [id]
  )
  return result.rows[0] || null
}

async function findByClientId(clientId) {
  const result = await pool.query(
    `SELECT id, client_id, name, email, phone, photo_url, skills 
     FROM users WHERE client_id = $1 AND role = 'worker'`,
    [clientId]
  )
  return result.rows[0] || null
}

async function searchWorkers({ service, location, minRating, limit = 20 }) {
  let query = `
    SELECT 
      u.id, u.client_id, u.name, u.photo_url,
      COALESCE(u.primary_skill, wa.primary_role) AS primary_skill,
      wa.secondary_roles,
      u.skills, u.hourly_rate, u.is_online, u.completed_jobs
    FROM users u
    LEFT JOIN worker_applications wa ON wa.user_id = u.id
    WHERE u.role = 'worker' 
      AND u.status = 'active'
      AND u.is_online = true
  `
  const params = []

  if (service) {
    params.push(`%${service}%`)
    query += ` AND (u.primary_skill ILIKE $${params.length} OR wa.secondary_roles::text ILIKE $${params.length})`
  }

  query += ` ORDER BY u.completed_jobs DESC LIMIT $${params.length + 1}`
  params.push(limit)

  const result = await pool.query(query, params)
  return result.rows
}

module.exports = { findById, findByClientId, searchWorkers }