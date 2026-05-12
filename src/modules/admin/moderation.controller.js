// sajilo-backend/src/modules/admin/moderation.controller.js
const { pool } = require('../../config/database');
const moderationService = require('./moderation.service');
const activityService = require('../activity/activity.service');

/**
 * PUT /api/admin/moderation/suspend
 * Body: { userId, role, reason }
 */
async function suspendUser(req, res) {
  try {
    const adminId = req.user.id;
    const { userId, role, reason } = req.body;

    // Basic validation
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ error: 'Invalid userId' });
    }
    if (!['worker', 'customer'].includes(role)) {
      return res.status(400).json({ error: 'role must be worker or customer' });
    }

    // Get current status
    const userRes = await pool.query(
      'SELECT moderation_status FROM users WHERE id = $1',
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.moderation_status === 'suspended') {
      return res.status(400).json({ error: 'User is already suspended' });
    }

    const previousStatus = user.moderation_status;

    // Update the user
    await pool.query(
      `UPDATE users SET moderation_status = 'suspended' WHERE id = $1`,
      [userId]
    );

    // Log the moderation action
    await moderationService.logModerationAction({
      actorId: adminId,
      targetId: userId,
      targetRole: role,
      action: 'suspend',
      previousStatus,
      newStatus: 'suspended',
      note: reason || null,
    });

    // Log to activity timeline
    try {
      await activityService.logActivity({
        type: 'moderation',
        action: 'suspended',
        entityType: 'user',
        entityId: userId,
        title: `User #${userId} (${role}) suspended`,
        metadata: { adminId, reason: reason || null },
        createdBy: adminId,
      });
    } catch (err) { console.error('Activity log failed (user.suspended):', err.message); }

    return res.json({ success: true, message: 'User suspended' });
  } catch (err) {
    console.error('suspendUser error:', err);
    return res.status(500).json({ error: 'Failed to suspend user' });
  }
}

/**
 * PUT /api/admin/moderation/unsuspend
 * Body: { userId, role }
 */
async function unsuspendUser(req, res) {
  try {
    const adminId = req.user.id;
    const { userId, role } = req.body;

    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ error: 'Invalid userId' });
    }
    if (!['worker', 'customer'].includes(role)) {
      return res.status(400).json({ error: 'role must be worker or customer' });
    }

    const userRes = await pool.query(
      'SELECT moderation_status FROM users WHERE id = $1',
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.moderation_status !== 'suspended') {
      return res.status(400).json({ error: 'User is not suspended' });
    }

    const previousStatus = user.moderation_status;

    await pool.query(
      `UPDATE users SET moderation_status = 'active' WHERE id = $1`,
      [userId]
    );

    await moderationService.logModerationAction({
      actorId: adminId,
      targetId: userId,
      targetRole: role,
      action: 'unsuspend',
      previousStatus,
      newStatus: 'active',
      note: null,
    });

    // Log to activity timeline
    try {
      await activityService.logActivity({
        type: 'moderation',
        action: 'restored',
        entityType: 'user',
        entityId: userId,
        title: `User #${userId} (${role}) unsuspended`,
        metadata: { adminId },
        createdBy: adminId,
      });
    } catch (err) { console.error('Activity log failed (user.restored):', err.message); }

    return res.json({ success: true, message: 'User unsuspended' });
  } catch (err) {
    console.error('unsuspendUser error:', err);
    return res.status(500).json({ error: 'Failed to unsuspend user' });
  }
}

module.exports = { suspendUser, unsuspendUser };