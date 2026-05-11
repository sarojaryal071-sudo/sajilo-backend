// sajilo-backend/src/modules/workers/workerServices.service.js
const { pool } = require('../../config/database');

/**
 * Resolve the worker's professions from either the new worker_professions table
 * or by falling back to the user's primary_skill and secondary_roles fields.
 *
 * Returns an array of { id, name, icon }.
 */
async function resolveProfessions(workerId) {
  // 1. Try the new worker_professions table first
  const wpResult = await pool.query(
    `SELECT p.id, p.name, p.icon
     FROM worker_professions wp
     JOIN professions p ON p.id = wp.profession_id
     WHERE wp.worker_id = $1 AND p.is_active = true`,
    [workerId]
  );
  if (wpResult.rows.length > 0) return wpResult.rows;

  // 2. Fall back to legacy sign‑up fields (users + worker_applications)
  const userResult = await pool.query(
    `SELECT u.primary_skill, u.secondary_roles,
            wa.primary_role AS app_primary,
            wa.secondary_roles AS app_secondaries
     FROM users u
     LEFT JOIN worker_applications wa ON wa.user_id = u.id
     WHERE u.id = $1`,
    [workerId]
  );
  const row = userResult.rows[0];
  if (!row) return [];

  // Collect profession names, preferring application data, then user fields
  const names = [];
  const add = (val) => {
    if (val && !names.includes(val.trim())) names.push(val.trim());
  };

  add(row.app_primary || row.primary_skill);
  (row.app_secondaries || row.secondary_roles || []).forEach(r => add(r));

  if (names.length === 0) return [];

  // Ensure each name exists in the professions table (upsert)
  const resultRows = [];
  for (const name of names) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const res = await pool.query(
      `INSERT INTO professions (slug, name)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name, icon`,
      [slug, name]
    );
    resultRows.push(res.rows[0]);
  }

  return resultRows;
}

/**
 * Get all services for a worker, grouped by profession.
 */
async function getWorkerServices(workerId) {
  const professions = await resolveProfessions(workerId);

  for (const prof of professions) {
    const svcResult = await pool.query(
      `SELECT
         ps.id AS service_id,
         ps.label,
         ps.label_np,
         ps.base_price,
         ws.price AS worker_price,
         ws.is_active,
         ws.id AS worker_service_id,
         false AS is_custom,
         ws.custom_label
       FROM profession_services ps
       LEFT JOIN worker_services ws
         ON ws.service_id = ps.id AND ws.worker_id = $1
       WHERE ps.profession_id = $2 AND ps.is_active = true
       UNION
       SELECT
         NULL AS service_id,
         ws.custom_label AS label,
         NULL AS label_np,
         NULL AS base_price,
         ws.price AS worker_price,
         ws.is_active,
         ws.id AS worker_service_id,
         true AS is_custom,
         ws.custom_label
       FROM worker_services ws
       WHERE ws.worker_id = $1 AND ws.profession_id = $2 AND ws.service_id IS NULL`,
      [workerId, prof.id]
    );
    prof.services = svcResult.rows;
  }

  return professions;
}

/**
 * Update a worker service row (price, is_active).
 */
async function updateWorkerService(workerId, serviceId, { price, is_active }) {
  const result = await pool.query(
    `UPDATE worker_services
     SET price = COALESCE($3, price),
         is_active = COALESCE($4, is_active)
     WHERE id = $1 AND worker_id = $2
     RETURNING *`,
    [serviceId, workerId, price, is_active]
  );
  return result.rows[0] || null;
}

/**
 * Create a custom service for a worker (no admin-defined service_id).
 */
async function createCustomService(workerId, { profession_id, custom_label, price }) {
  const result = await pool.query(
    `INSERT INTO worker_services (worker_id, profession_id, service_id, custom_label, price, is_active)
     VALUES ($1, $2, NULL, $3, $4, true)
     RETURNING *`,
    [workerId, profession_id, custom_label, price || 0]
  );
  return result.rows[0];
}

/**
 * Upsert a worker_service row for an admin-defined service.
 */
async function activateService(workerId, professionId, serviceId, isActive) {
  const existing = await pool.query(
    'SELECT id FROM worker_services WHERE worker_id = $1 AND service_id = $2',
    [workerId, serviceId]
  );

  if (existing.rows.length > 0) {
    const result = await pool.query(
      'UPDATE worker_services SET is_active = $3 WHERE id = $1 AND worker_id = $2 RETURNING *',
      [existing.rows[0].id, workerId, isActive]
    );
    return result.rows[0];
  }

  const prof = await pool.query('SELECT id FROM professions WHERE id = $1', [professionId]);
  if (prof.rows.length === 0) throw new Error('Profession not found');

  const result = await pool.query(
    `INSERT INTO worker_services (worker_id, profession_id, service_id, price, is_active)
     VALUES ($1, $2, $3, 0, $4)
     RETURNING *`,
    [workerId, professionId, serviceId, isActive]
  );
  return result.rows[0];
}

async function deleteWorkerService(workerId, serviceId) {
  await pool.query(
    'DELETE FROM worker_services WHERE id = $1 AND worker_id = $2',
    [serviceId, workerId]
  );
}

async function getPublicWorkerServices(workerId) {
  const professions = await resolveProfessions(workerId);

  for (const prof of professions) {
    const svcResult = await pool.query(
      `SELECT
         ps.id AS service_id,
         ps.label,
         ps.label_np,
         ws.price AS worker_price,
         ws.is_active,
         false AS is_custom,
         NULL AS custom_label
       FROM worker_services ws
       JOIN profession_services ps ON ps.id = ws.service_id
       WHERE ws.worker_id = $1 AND ws.profession_id = $2 AND ws.is_active = true AND ps.is_active = true
       UNION
       SELECT
         NULL AS service_id,
         ws.custom_label AS label,
         NULL AS label_np,
         ws.price AS worker_price,
         ws.is_active,
         true AS is_custom,
         ws.custom_label
       FROM worker_services ws
       WHERE ws.worker_id = $1 AND ws.profession_id = $2 AND ws.is_active = true AND ws.service_id IS NULL`,
      [workerId, prof.id]
    );
    prof.services = svcResult.rows;
  }

  return professions;
}

module.exports = {
  getWorkerServices,
  updateWorkerService,
  createCustomService,
  activateService,
  deleteWorkerService,
  getPublicWorkerServices,
};