// sajilo-backend/src/modules/media/media.controller.js
const mediaService = require('./media.service');

async function uploadProfileImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const { entityType } = req.body;  // 'user' or 'worker'
    const userId = req.user.id;       // from auth middleware
    const result = await mediaService.saveProfileImage(req.file, entityType, userId);
    res.json({ success: true, url: result.url });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function uploadDocument(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const { entityType } = req.body;
    const userId = req.user.id;
    const result = await mediaService.saveDocument(req.file, entityType, userId);
    res.json({ success: true, url: result.url });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function getByEntity(req, res) {
  try {
    const { entity_type, entity_id } = req.params;
    const files = await mediaService.getFilesByEntity(entity_type, entity_id);
    res.json({ success: true, data: files });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    await mediaService.deleteFile(Number(id));
    res.json({ success: true, message: 'Media deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = { uploadProfileImage, uploadDocument, getByEntity, remove };