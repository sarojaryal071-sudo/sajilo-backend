// sajilo-backend/src/modules/admin/announcements.controller.js
const announcementsService = require('./announcements.service');

/**
 * POST /api/admin/announcements
 * Create a new announcement.
 */
async function create(req, res) {
  try {
    const adminId = req.user.id;
    const { title, message, targetRoles, isDismissible, expiresAt } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'message is required' });
    }

    const announcement = await announcementsService.create({
      title: title.trim(),
      message: message.trim(),
      targetRoles: targetRoles || ['worker', 'customer'],
      isDismissible: isDismissible !== false,
      expiresAt: expiresAt || null,
      createdBy: adminId,
    });

    return res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    console.error('create announcement error:', err);
    return res.status(500).json({ error: 'Failed to create announcement' });
  }
}

/**
 * GET /api/admin/announcements
 * List all announcements (admin view).
 */
async function getAll(req, res) {
  try {
    const announcements = await announcementsService.getAll();
    return res.json({ success: true, data: announcements });
  } catch (err) {
    console.error('getAll announcements error:', err);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}

/**
 * PUT /api/admin/announcements/:id
 * Update an announcement.
 */
async function update(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const updated = await announcementsService.update(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Announcement not found' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('update announcement error:', err);
    return res.status(500).json({ error: 'Failed to update announcement' });
  }
}

/**
 * DELETE /api/admin/announcements/:id
 * Delete an announcement.
 */
async function remove(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }
    await announcementsService.remove(id);
    return res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    console.error('delete announcement error:', err);
    return res.status(500).json({ error: 'Failed to delete announcement' });
  }
}

/**
 * GET /api/announcements
 * Fetch active announcements for the current user's role (public).
 */
async function getActiveForUser(req, res) {
  try {
    const userRole = req.user?.role || 'customer';
    const announcements = await announcementsService.getActiveForRole(userRole);
    return res.json({ success: true, data: announcements });
  } catch (err) {
    console.error('getActive announcements error:', err);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}

module.exports = { create, getAll, update, remove, getActiveForUser };