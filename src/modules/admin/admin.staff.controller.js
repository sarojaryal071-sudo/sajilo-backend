const staffService = require('./admin.staff.service');

async function createStaff(req, res) {
  try {
    const adminId = req.user.id;
    const { email, password, name, role } = req.body;

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

async function toggleStaff(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { active } = req.body;
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active must be true or false' });
    }

    const updated = await staffService.toggleStaffStatus(userId, active);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('toggleStaff error:', err);
    return res.status(400).json({ error: err.message || 'Failed to update staff status' });
  }
}

module.exports = { createStaff, listStaff, toggleStaff };