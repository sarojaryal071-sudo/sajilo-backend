// sajilo-backend/src/modules/files/files.controller.js
const filesService = require('./files.service');

/**
 * DELETE /api/files/:type/:id
 * type = 'profile_image' or 'document'
 */
async function remove(req, res) {
  try {
    const { type, id } = req.params;
    const userId = req.user.id;

    if (type === 'profile_image') {
      const result = await filesService.deleteProfileImage(userId);
      return res.json({ success: true, ...result });
    }
    else if (type === 'document') {
      const result = await filesService.deleteDocument(Number(id), userId);
      return res.json({ success: true, ...result });
    }
    else {
      return res.status(400).json({ success: false, error: 'Invalid type' });
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

/**
 * PUT /api/files/profile-image
 * Replaces the profile image (multipart/form-data with 'file' field).
 */
async function replaceProfileImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const result = await filesService.replaceProfileImage(req.user.id, req.file);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = { remove, replaceProfileImage };