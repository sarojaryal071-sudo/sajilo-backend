// sajilo-backend/src/modules/files/files.model.js
const { pool } = require('../../config/database');

/**
 * Set the user's profile_image_url to NULL.
 */
async function clearUserProfileImage(userId) {
  const result = await pool.query(
    `UPDATE users SET profile_image_url = NULL WHERE id = $1 RETURNING profile_image_url`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Set the user's profile_image_url to a new value.
 */
async function setUserProfileImage(userId, url) {
  const result = await pool.query(
    `UPDATE users SET profile_image_url = $1 WHERE id = $2 RETURNING profile_image_url`,
    [url, userId]
  );
  return result.rows[0] || null;
}

/**
 * Get a document by ID and verify ownership.
 */
async function getDocumentById(documentId, userId) {
  const result = await pool.query(
    `SELECT * FROM worker_documents WHERE id = $1 AND user_id = $2`,
    [documentId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Delete a document record.
 */
async function deleteDocument(documentId) {
  await pool.query(`DELETE FROM worker_documents WHERE id = $1`, [documentId]);
}

module.exports = { clearUserProfileImage, setUserProfileImage, getDocumentById, deleteDocument };