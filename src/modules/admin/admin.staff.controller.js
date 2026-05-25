const staffService = require('./admin.staff.service');
const staffProfileService = require('./staffProfile.service');
const { pool } = require('../../config/database');
const bcrypt = require('bcryptjs');
const { logAuditEvent } = require('../../services/audit.service');

async function createStaff(req, res) {
  try {
    const adminId = req.user.id;
    const { email, password, name, role, ...profileFields } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'email, password, name, and role are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }

    const staff = await staffService.createStaff({
      email: email.trim().toLowerCase(),
      password,
      name: name.trim(),
      role,
      createdBy: adminId,
      ...profileFields,
    });

    await logAuditEvent({
      actor: req.user,
      action: 'staff.create',
      entityType: 'staff',
      entityId: staff.id,
      entityLabel: staff.email,
      newValues: { email: staff.email, role: req.body.role, client_id: staff.client_id },
      req,
    });

    return res.status(201).json({ success: true, data: staff });
  } catch (err) {
    console.error('createStaff error:', err);
    return res.status(400).json({ error: err.message || 'Failed to create staff account' });
  }
}

async function listStaff(req, res) {
  try {
    const staff = await staffService.listStaff();
    return res.json({ success: true, data: staff });
  } catch (err) {
    console.error('listStaff error:', err);
    return res.status(500).json({ error: 'Failed to fetch staff list' });
  }
}

async function getStaffById(req, res) {
  try {
    const userId = Number(req.params.id);
    const profile = await staffProfileService.getProfileByUserId(userId);
    if (!profile) return res.status(404).json({ error: 'Staff profile not found' });

    const userResult = await pool.query(
      `SELECT id, email, name, role, status, client_id FROM users WHERE id = $1`,
      [userId]
    );
    const user = userResult.rows[0] || {};

    let createdByClientId = null;
    if (profile.created_by) {
      const creatorResult = await pool.query(
        `SELECT client_id FROM users WHERE id = $1`,
        [profile.created_by]
      );
      createdByClientId = creatorResult.rows[0]?.client_id || null;
    }

    return res.json({
      success: true,
      data: {
        ...profile,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        created_by_client_id: createdByClientId,
      }
    });
  } catch (err) {
    console.error('getStaffById error:', err);
    return res.status(500).json({ error: 'Failed to fetch staff' });
  }
}

async function changeStaffRole(req, res) {
  try {
    const userId = Number(req.params.userId);
    const { role } = req.body;   // role slug, e.g. "communication-officer"
    if (!role) return res.status(400).json({ error: 'role is required' });

    // Validate role exists
    const roleResult = await pool.query(`SELECT id FROM roles WHERE slug = $1`, [role]);
    if (roleResult.rows.length === 0) return res.status(400).json({ error: 'Invalid role' });
    const roleId = roleResult.rows[0].id;

    // Update user's role_id (and legacy role column for compatibility)
    await pool.query(
      `UPDATE users SET role_id = $1, role = 'admin' WHERE id = $2`,
      [roleId, userId]
    );

    // Force logout by disconnecting sockets? (done via socket)
    // For immediate effect, we could emit a socket event, but for simplicity, the next request will pick up the new role.

    await logAuditEvent({
      actor: req.user,
      action: 'staff.role_change',
      entityType: 'staff',
      entityId: userId,
      entityLabel: `user ${userId}`,
      oldValues: { role: req.body.oldRole || 'unknown' },
      newValues: { role },
      req,
    });

    return res.json({ success: true, message: 'Role updated' });
  } catch (err) {
    console.error('changeStaffRole error:', err);
    return res.status(500).json({ error: 'Failed to change role' });
  }
}

async function changeStaffStatus(req, res) {
  try {
    const userId = Number(req.params.userId);
    const { status } = req.body;   // active, suspended, on_leave, terminated
    const allowed = ['active', 'suspended', 'on_leave', 'terminated'];
    if (!status || !allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    // Update staff profile status (triggers ticket release if suspended/terminated)
    await staffProfileService.updateStatus(userId, status);

    // Also update user status (for login enforcement)
    const userStatus = (status === 'active' || status === 'on_leave') ? 'active' : 'inactive';
    await pool.query(`UPDATE users SET status = $1 WHERE id = $2`, [userStatus, userId]);

    await logAuditEvent({
      actor: req.user,
      action: `staff.${status}`,
      entityType: 'staff',
      entityId: userId,
      entityLabel: `user ${userId}`,
      newValues: { status },
      req,
    });

    return res.json({ success: true, message: 'Status updated' });


  } catch (err) {
    console.error('changeStaffStatus error:', err);
    return res.status(500).json({ error: 'Failed to change status' });
  }
}

async function resetStaffPassword(req, res) {
  try {
    const userId = Number(req.params.userId);
    const tempPassword = Math.random().toString(36).slice(-8);   // simple temporary password
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await pool.query(
      `UPDATE users SET password_hash = $1, must_change_password = TRUE WHERE id = $2`,
      [passwordHash, userId]
    );

    await logAuditEvent({
      actor: req.user,
      action: 'staff.password_reset',
      entityType: 'staff',
      entityId: userId,
      entityLabel: `user ${userId}`,
      req,
    });

    return res.json({ success: true, data: { tempPassword } });
  } catch (err) {
    console.error('resetStaffPassword error:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
}

module.exports = { createStaff, listStaff, getStaffById, changeStaffRole, changeStaffStatus, resetStaffPassword };