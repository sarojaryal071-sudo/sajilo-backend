const { pool } = require('../../config/database')

async function create({ title, message, priority, targetType, targetCategory, createdBy }) {
  const result = await pool.query(
    `INSERT INTO notifications (title, message, priority, target_type, target_category, created_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'sent')
     RETURNING *`,
    [title, message, priority, targetType, targetCategory, createdBy]
  )
  return result.rows[0]
}

async function getAll(limit = 50) {
  const result = await pool.query(
    `SELECT * FROM notifications ORDER BY created_at DESC LIMIT $1`,
    [limit]
  )
  return result.rows
}

module.exports = { create, getAll }