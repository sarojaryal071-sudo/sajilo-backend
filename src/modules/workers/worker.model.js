/*
 * Worker Model — database queries for worker profiles
 */
const { pool } = require('../../config/database')

async function findById(id) {
  const result = await pool.query(
    `SELECT u.id, u.client_id, u.name, u.email, u.phone, u.photo_url, u.skills, 
            u.bio, u.hourly_rate, u.is_online, u.verification_status, u.status,
            u.total_earnings, u.completed_jobs, u.created_at,
            COALESCE(AVG(r.rating)::numeric, 0) as average_rating,
            COUNT(r.id)::int as review_count
     FROM users u
     LEFT JOIN reviews r ON r.worker_id = u.id
     WHERE u.id = $1 AND u.role = 'worker'
     GROUP BY u.id`,
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

async function searchWorkers({ service, location, minRating, limit = 20, sortBy }) {
  const params = []
  let query = `
    SELECT 
      u.id, u.client_id, u.name, u.photo_url,
      COALESCE(u.primary_skill, wa.primary_role) AS primary_skill,
      wa.secondary_roles,
      wa.service_area,
      u.skills, u.hourly_rate, u.is_online, u.completed_jobs,
      COALESCE(AVG(r.rating)::numeric, 0) as average_rating,
      COUNT(r.id)::int as review_count
    FROM users u
    LEFT JOIN worker_applications wa ON wa.user_id = u.id
    LEFT JOIN reviews r ON r.worker_id = u.id
    WHERE u.role = 'worker' 
      AND u.status = 'active'
      AND u.is_online = true
  `

  // Keyword search across multiple fields (only if service keyword is given)
  if (service && service.trim()) {
    const keyword = `%${service.trim()}%`
    params.push(keyword)
    query += ` AND (
      u.name ILIKE $${params.length}
      OR u.client_id ILIKE $${params.length}
      OR COALESCE(u.primary_skill, wa.primary_role) ILIKE $${params.length}
      OR wa.secondary_roles::text ILIKE $${params.length}
      OR u.skills::text ILIKE $${params.length}
    )`
  }

  if (location && location.trim()) {
    params.push(`%${location.trim()}%`)
    query += ` AND wa.service_area ILIKE $${params.length}`
  }

  // Group and sort by average rating for better relevance
  query += ` GROUP BY u.id, wa.primary_role, wa.secondary_roles, wa.service_area`
  // Sort by requested criteria (config-driven, defaults to rating)
  if (sortBy === 'trust_score') {
    query += ` ORDER BY u.completed_jobs DESC, average_rating DESC`
  } else if (sortBy === 'completion_rate') {
    query += ` ORDER BY u.completed_jobs DESC, average_rating DESC`
  } else if (sortBy === 'jobs') {
    query += ` ORDER BY u.completed_jobs DESC, average_rating DESC`
  } else {
    // Sort by requested criteria, default to rating
  if (sortBy === 'trust_score' || sortBy === 'jobs') {
    query += ` ORDER BY u.completed_jobs DESC, average_rating DESC`
  } else {
    query += ` ORDER BY average_rating DESC, u.completed_jobs DESC`
  }
  }
  query += ` LIMIT $${params.length + 1}`
  params.push(limit)

  let result = await pool.query(query, params)

  // Fallback: if keyword search returned nothing, return all online workers
  if (service && service.trim() && result.rows.length === 0) {
    const fallbackQuery = `
      SELECT 
        u.id, u.client_id, u.name, u.photo_url,
        COALESCE(u.primary_skill, wa.primary_role) AS primary_skill,
        wa.secondary_roles,
        wa.service_area,
        u.skills, u.hourly_rate, u.is_online, u.completed_jobs,
        COALESCE(AVG(r.rating)::numeric, 0) as average_rating,
        COUNT(r.id)::int as review_count
      FROM users u
      LEFT JOIN worker_applications wa ON wa.user_id = u.id
      LEFT JOIN reviews r ON r.worker_id = u.id
      WHERE u.role = 'worker' 
        AND u.status = 'active'
        AND u.is_online = true
      GROUP BY u.id, wa.primary_role, wa.secondary_roles, wa.service_area
      ORDER BY average_rating DESC, u.completed_jobs DESC
      LIMIT $1
    `
    result = await pool.query(fallbackQuery, [limit])
  }

  return result.rows
}

module.exports = { findById, findByClientId, searchWorkers }