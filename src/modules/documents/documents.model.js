const { pool } = require('../../config/database');

async function create({ userId, type, fileUrl, originalFilename }) {
  const result = await pool.query(
    `INSERT INTO worker_documents (user_id, type, file_url, original_filename)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, type, fileUrl, originalFilename]
  );
  return result.rows[0];
}

async function findByUser(userId) {
  const result = await pool.query(
    `SELECT * FROM worker_documents WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT * FROM worker_documents WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await pool.query(
    `DELETE FROM worker_documents WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { create, findByUser, findById, remove };