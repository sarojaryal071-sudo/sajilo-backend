// sajilo-backend/src/modules/admin/professionServices.service.js
const { pool } = require('../../config/database');

/**
 * Get all services for a given profession, ordered by sort_order.
 */
async function getByProfession(professionId) {
  const result = await pool.query(
    'SELECT * FROM profession_services WHERE profession_id = $1 ORDER BY sort_order, id',
    [professionId]
  );
  return result.rows;
}

/**
 * Create a new service under a profession.
 * @param {Object} data - { profession_id, label, label_np, sort_order }
 */
async function create(data) {
  const { profession_id, label, label_np, sort_order, base_price } = data;
  const result = await pool.query(
    `INSERT INTO profession_services (profession_id, label, label_np, sort_order, base_price)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [profession_id, label, label_np || null, sort_order || 0, base_price || null]
  );
  return result.rows[0];
}

/**
 * Update an existing service.
 */
async function update(id, data) {
  const { label, label_np, sort_order, is_active, base_price } = data;
  const result = await pool.query(
    `UPDATE profession_services
     SET label = COALESCE($2, label),
         label_np = COALESCE($3, label_np),
         sort_order = COALESCE($4, sort_order),
         is_active = COALESCE($5, is_active),
         base_price = COALESCE($6, base_price)
     WHERE id = $1
     RETURNING *`,
    [id, label, label_np, sort_order, is_active, base_price]
  );
  return result.rows[0] || null;
}

/**
 * Soft-delete (deactivate) a service.
 */
async function remove(id) {
  await pool.query(
    'DELETE FROM profession_services WHERE id = $1',
    [id]
  );
}

module.exports = { getByProfession, create, update, remove };