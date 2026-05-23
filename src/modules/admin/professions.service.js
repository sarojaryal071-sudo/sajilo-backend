// sajilo-backend/src/modules/admin/professions.service.js
const { pool } = require('../../config/database');

/**
 * Get all professions, ordered by sort_order.
 */
async function getAll() {
  const result = await pool.query(
    'SELECT * FROM professions ORDER BY sort_order, id'
  );
  return result.rows;
}

/**
 * Get a single profession by ID.
 */
async function getById(id) {
  const result = await pool.query(
    'SELECT * FROM professions WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Create a new profession.
 * @param {Object} data - { slug, name, name_np, icon, sort_order }
 */
async function create(data) {
  const { slug, name, name_np, icon, sort_order, icon_image_url, icon_image_public_id, display_section } = data;
  const result = await pool.query(
    `INSERT INTO professions (slug, name, name_np, icon, sort_order, icon_image_url, icon_image_public_id, display_section)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [slug, name, name_np || null, icon || null, sort_order || 0, icon_image_url || null, icon_image_public_id || null, display_section || 'primary']
  );
  return result.rows[0];
}

/**
 * Update an existing profession.
 */
async function update(id, data) {
  const { name, name_np, icon, sort_order, is_active, icon_image_url, icon_image_public_id, display_section } = data;
  const result = await pool.query(
    `UPDATE professions
     SET name = COALESCE($2, name),
         name_np = COALESCE($3, name_np),
         icon = COALESCE($4, icon),
         sort_order = COALESCE($5, sort_order),
         is_active = COALESCE($6, is_active),
         icon_image_url = COALESCE($7, icon_image_url),
         icon_image_public_id = COALESCE($8, icon_image_public_id),
         display_section = COALESCE($9, display_section)
     WHERE id = $1
     RETURNING *`,
    [id, name, name_np, icon, sort_order, is_active, icon_image_url, icon_image_public_id, display_section]
  );
  return result.rows[0] || null;
}

/**
 * Soft-delete (deactivate) a profession.
 */
async function remove(id) {
  // Hard delete – cascades to profession_services and worker_professions
  await pool.query('DELETE FROM professions WHERE id = $1', [id]);
}

module.exports = { getAll, getById, create, update, remove };