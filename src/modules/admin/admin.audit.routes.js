const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const authGuard = require('../../middleware/auth.guard');
const permissionGuard = require('../../middleware/permission.guard');

// ── Lens action mappings ──────────────────────────────────────
const LENS_ACTIONS = {
  security: [
    'auth.login.success',
    'auth.login.failed',
    'auth.password_changed',
    'role.updated',
    'role.permissions_updated',
  ],
  ops: [
    'staff.create',
    'staff.suspended',
    'staff.reactivated',
    'staff.terminated',
    'staff.role_change',
    'staff.password_reset',
    'ticket.claimed',
    'ticket.released',
    'ticket.resolved',
    'ticket.escalated',
    'dispute.opened',
    'dispute.status_changed',
  ],
  finance: [
    'payment.success',
    'payment.failed',
    'refund.created',
    'payout.sent',
  ],
};

// ── Normalize action filters ──────────────────────────────────
function resolveActionFilter(query) {
  // 1. Lens overrides everything
  if (query.lens && LENS_ACTIONS[query.lens]) {
    return LENS_ACTIONS[query.lens];
  }
  // 2. Multiple actions (array or comma-separated string)
  if (query.actions) {
    if (Array.isArray(query.actions)) return query.actions;          // ?actions[]=a&actions[]=b
    return query.actions.split(',').map(s => s.trim()).filter(Boolean); // ?actions=a,b
  }
  // 3. Single action (legacy)
  if (query.action) {
    return [query.action];
  }
  return null; // no action filter
}

router.use(authGuard);
router.use(permissionGuard('view_audit_logs'));

// GET /api/admin/audit
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 25, entityType, actor, search, startDate, endDate } = req.query;
    const actionFilter = resolveActionFilter(req.query);

    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(parseInt(limit), 100);
    const params = [];
    const conditions = [];

    // Action filter using ANY(array)
    if (actionFilter && actionFilter.length > 0) {
      params.push(actionFilter);
      conditions.push(`action = ANY($${params.length}::text[])`);
    }

    // Other filters (indexes increase accordingly)
    if (entityType) {
      params.push(entityType);
      conditions.push(`entity_type = $${params.length}`);
    }
    if (actor) {
      params.push(`%${actor}%`);
      conditions.push(`(actor_name ILIKE $${params.length} OR actor_client_id ILIKE $${params.length})`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`entity_label ILIKE $${params.length}`);
    }
    if (startDate) {
      params.push(startDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      conditions.push(`created_at <= $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countResult = await pool.query(`SELECT COUNT(*) FROM audit_logs ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch page
    params.push(Math.min(parseInt(limit), 100));
    params.push(offset);
    const result = await pool.query(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Group hint (does not change query, just informs client)
    const validGroupBy = ['entity', 'actor'];
    const groupHint = validGroupBy.includes(req.query.groupBy) ? req.query.groupBy : null;

    res.json({
      success: true,
      data: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      groupHint,
    });
  } catch (err) {
    console.error('Audit fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/admin/audit/:id
router.get('/:id', async (req, res) => {
  const result = await pool.query(`SELECT * FROM audit_logs WHERE id = $1`, [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Audit log not found' });
  res.json({ success: true, data: result.rows[0] });
});

module.exports = router;