// sajilo-backend/src/modules/files/files.controller.js
const filesService = require('./files.service');
const mediaAuditService = require('../media/mediaAudit.service');

async function remove(req, res) {
  try {
    const { type, id } = req.params;
    const userId = req.user.id;

    if (type === 'profile_image') {
      const result = await filesService.deleteProfileImage(userId);
      await mediaAuditService.logAction({ userId, fileType: 'profile', action: 'delete', req });
      return res.json({ success: true, ...result });
    }
    else if (type === 'document') {
      const result = await filesService.deleteDocument(Number(id), userId);
      await mediaAuditService.logAction({ userId, fileType: 'document', action: 'delete', req });
      return res.json({ success: true, ...result });
    }
    else {
      return res.status(400).json({ success: false, error: 'Invalid type' });
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function replaceProfileImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const result = await filesService.replaceProfileImage(req.user.id, req.file);
    await mediaAuditService.logAction({ userId: req.user.id, fileType: 'profile', fileUrl: result.profile_image_url, action: 'replace', req });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = { remove, replaceProfileImage };