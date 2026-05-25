const express = require('express');
const router = express.Router();
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');
const { pool } = require('../../config/database');

// All routes require manage_staff permission (Super Admin)
router.use(authGuard, permissionGuard('manage_staff'));

// GET all roles
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, name, slug, description, is_system FROM roles ORDER BY id`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// POST create a new role
router.post('/', async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
    const result = await pool.query(
      `INSERT INTO roles (name, slug, description) VALUES ($1, $2, $3) RETURNING *`,
      [name, slug, description || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create role' });
  }
});

// PUT update a role (name, description)
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await pool.query(
      `UPDATE roles SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *`,
      [name, description, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Role not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update role' });
  }
});

// DELETE a role (only non-system roles)
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM roles WHERE id = $1 AND is_system = FALSE RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Role not found or is a system role' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// GET permissions for a specific role
router.get('/:id/permissions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.key, p.label, p.section_key
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1
       ORDER BY p.section_key, p.key`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// PUT update permissions for a role (replace entire set)
router.put('/:id/permissions', async (req, res) => {
  try {
    const { permissionIds } = req.body;
    if (!Array.isArray(permissionIds)) return res.status(400).json({ error: 'permissionIds must be an array' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [req.params.id]);
      for (const permId of permissionIds) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [req.params.id, permId]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update permissions' });
  }
});

module.exports = router;