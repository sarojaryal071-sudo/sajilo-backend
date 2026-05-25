const express = require('express')
const router = express.Router()
const adminController = require('./admin.controller')
const authGuard = require('../../middleware/auth.guard')
const roleGuard = require('../../middleware/role.guard')
const roleService = require('./role.service')

router.get('/workers', authGuard, roleGuard('admin'), adminController.getWorkers)
router.put('/workers/:id/approve', authGuard, roleGuard('admin'), adminController.approveWorker)
router.put('/workers/:id/reject', authGuard, roleGuard('admin'), adminController.rejectWorker)
router.get('/stats', authGuard, roleGuard('admin'), adminController.getStats)
router.get('/customers', authGuard, roleGuard('admin'), adminController.getCustomers)

// Analytics
router.use('/analytics', authGuard, roleGuard('admin'), require('./admin.analytics.routes'))
router.use('/professions', authGuard, roleGuard('admin'), require('./admin.professions.routes'))
router.use('/professions', authGuard, roleGuard('admin'), require('./admin.professionServices.routes'))

// Feature Flags (Phase 12D)
router.use('/feature-flags', authGuard, roleGuard('admin'), require('./admin.featureFlags.routes'))
router.use('/live-operations', authGuard, roleGuard('admin'), require('./admin.liveOperations.routes'))
router.use('/moderation', authGuard, roleGuard('admin'), require('./moderation.routes'))
router.use('/finance', authGuard, roleGuard('admin'), require('../financialReporting/financialReporting.routes'));
router.use('/roles', require('./roles.routes'));


// List all roles (for staff assignment dropdown)
router.get('/roles', authGuard, async (req, res) => {
  try {
    const result = await require('../../config/database').pool.query(
      `SELECT id, name, slug, description FROM roles ORDER BY id`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// RBAC – return the current user's role, permissions, and accessible sections
router.get('/me/access', authGuard, async (req, res) => {
  try {
    const access = await roleService.resolveUserAccess(req.user.id);
    if (!access) return res.status(404).json({ error: 'User not found' });
    return res.json({ success: true, data: access });
  } catch (err) {
    console.error('Access fetch error:', err);
    return res.status(500).json({ error: 'Failed to resolve access' });
  }
});

// List all permissions grouped by section (for role editor)
router.get('/permissions', authGuard, async (req, res) => {
  try {
    const result = await require('../../config/database').pool.query(
      `SELECT id, key, label, section_key, description FROM permissions ORDER BY section_key, key`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

module.exports = router