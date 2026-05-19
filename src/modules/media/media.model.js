// sajilo-backend/src/modules/media/media.model.js
const { pool } = require('../../config/database');

async function create(record) {
  const { entity_type, entity_id, file_url, file_name, file_type, mime_type, size_bytes } = record;
  const result = await pool.query(
    `INSERT INTO media (entity_type, entity_id, file_url, file_name, file_type, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [entity_type, entity_id, file_url, file_name, file_type, mime_type, size_bytes]
  );
  return result.rows[0];
}

async function findByEntity(entityType, entityId) {
  const result = await pool.query(
    `SELECT * FROM media WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM media WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await pool.query('DELETE FROM media WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

module.exports = { create, findByEntity, findById, remove };