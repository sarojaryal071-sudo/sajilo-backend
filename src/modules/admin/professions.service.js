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
  const { slug, name, name_np, icon, sort_order } = data;
  const result = await pool.query(
    `INSERT INTO professions (slug, name, name_np, icon, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [slug, name, name_np || null, icon || null, sort_order || 0]
  );
  return result.rows[0];
}

/**
 * Update an existing profession.
 */
async function update(id, data) {
  const { name, name_np, icon, sort_order, is_active } = data;
  const result = await pool.query(
    `UPDATE professions
     SET name = COALESCE($2, name),
         name_np = COALESCE($3, name_np),
         icon = COALESCE($4, icon),
         sort_order = COALESCE($5, sort_order),
         is_active = COALESCE($6, is_active)
     WHERE id = $1
     RETURNING *`,
    [id, name, name_np, icon, sort_order, is_active]
  );
  return result.rows[0] || null;
}

/**
 * Soft-delete (deactivate) a profession.
 */
async function remove(id) {
  await pool.query(
    'UPDATE professions SET is_active = false WHERE id = $1',
    [id]
  );
}

module.exports = { getAll, getById, create, update, remove };