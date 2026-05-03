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

async function searchWorkers({ service, location, minRating, available, limit = 20 }) {
  let query = `SELECT id, client_id, name, photo_url, skills, hourly_rate, is_online, completed_jobs FROM users WHERE role = 'worker' AND status = 'active'`
  const params = []
  
  if (service) {
    params.push(`%${service}%`)
    query += ` AND skills::text ILIKE $${params.length}`
  }
  if (available) {
    query += ` AND is_online = true`
  }
  
  query += ` ORDER BY completed_jobs DESC LIMIT $${params.length + 1}`
  params.push(limit)
  
  const result = await pool.query(query, params)
  return result.rows
}

module.exports = { findById, findByClientId, searchWorkers }