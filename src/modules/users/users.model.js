const { pool } = require('../../config/database')

async function findById(id) {
  const result = await pool.query(
    'SELECT id, email, role, name, phone, photo_url, profile_image_url, status, created_at FROM users WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

async function update(id, fields) {
  const { name, phone, photo_url } = fields
  const result = await pool.query(
    `UPDATE users 
     SET name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         photo_url = COALESCE($3, photo_url),
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, email, role, name, phone, photo_url, profile_image_url, status, created_at`,
    [name, phone, photo_url, id]
  )
  return result.rows[0] || null
}

async function getWorkerProfile(userId) {
  const result = await pool.query(
    `SELECT u.id, u.email, u.role, u.name, u.phone, u.photo_url, u.profile_image_url, u.status,
            u.client_id,
            COALESCE(u.primary_skill, wa.primary_role) AS primary_skill,
            wa.secondary_roles AS secondary_roles,
            u.is_online, u.verification_status, u.skills, 
            u.total_earnings, u.completed_jobs, u.created_at
     FROM users u
     LEFT JOIN worker_applications wa ON wa.user_id = u.id
     WHERE u.id = $1 AND u.role = 'worker'`,
    [userId]
  )
  return result.rows[0] || null
}

async function updateWorkerProfile(userId, fields) {
  const { name, phone, photo_url, skills, is_online } = fields
  const result = await pool.query(
    `UPDATE users 
     SET name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         photo_url = COALESCE($3, photo_url),
         skills = COALESCE($4, skills),
         is_online = COALESCE($5, is_online),
         updated_at = NOW()
     WHERE id = $6 AND role = 'worker'
     RETURNING id, email, role, name, phone, photo_url, status,
               is_online, verification_status, skills, total_earnings, completed_jobs`,
    [name, phone, photo_url, skills, is_online, userId]
  )
  return result.rows[0] || null
}

async function getWorkerEarnings(userId) {
  const result = await pool.query(
    `SELECT 
       COALESCE(SUM(price), 0) as total_earnings,
       COUNT(*) as completed_jobs
     FROM bookings 
     WHERE worker_id = $1 AND status = 'completed'`,
    [userId]
  )
  return {
    total_earnings: parseInt(result.rows[0].total_earnings),
    completed_jobs: parseInt(result.rows[0].completed_jobs),
  }
}

async function getWorkerAvailability(userId) {
  const result = await pool.query(
    `SELECT day_of_week, morning, afternoon, evening 
     FROM worker_availability WHERE worker_id = $1`,
    [userId]
  )
  return result.rows
}

async function saveWorkerAvailability(userId, schedule) {
  for (const day of schedule) {
    await pool.query(
      `INSERT INTO worker_availability (worker_id, day_of_week, morning, afternoon, evening)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (worker_id, day_of_week) 
       DO UPDATE SET morning = $3, afternoon = $4, evening = $5`,
      [userId, day.day_of_week, day.morning, day.afternoon, day.evening]
    )
  }
  return getWorkerAvailability(userId)
}
module.exports = { findById, update, getWorkerProfile, updateWorkerProfile, getWorkerEarnings, getWorkerAvailability, saveWorkerAvailability }