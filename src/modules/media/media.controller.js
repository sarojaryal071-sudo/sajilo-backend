const mediaService = require('./media.service');
const { logAuditEvent } = require('../../services/audit.service');

async function uploadProfileImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const { entityType } = req.body;
    const userId = req.user.id;
    const result = await mediaService.saveProfileImage(req.file, entityType, userId);

    try {
      await logAuditEvent({
        req,
        actorId: userId,
        action: 'file.uploaded',
        entityType: 'media',
        entityId: result.media_id,
        entityDisplay: `User #${userId} profile image`,
        summary: `Profile image uploaded`,
        severity: 'low',
        category: 'media',
        outcome: 'success',
        newValues: { url: result.url, entityType },
      });
    } catch (auditErr) { console.error('Audit write failed (media upload):', auditErr); }

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

    try {
      await logAuditEvent({
        req,
        actorId: userId,
        action: 'document.uploaded',
        entityType: 'media',
        entityId: result.media_id,
        entityDisplay: `User #${userId} document`,
        summary: `Document uploaded`,
        severity: 'low',
        category: 'media',
        outcome: 'success',
        newValues: { url: result.url, entityType },
      });
    } catch (auditErr) { console.error('Audit write failed (document upload):', auditErr); }

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

    try {
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: 'file.deleted',
        entityType: 'media',
        entityId: Number(id),
        entityDisplay: `Media #${id}`,
        summary: `Media file deleted`,
        severity: 'low',
        category: 'media',
        outcome: 'success',
      });
    } catch (auditErr) { console.error('Audit write failed (media delete):', auditErr); }

    res.json({ success: true, message: 'Media deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = { uploadProfileImage, uploadDocument, getByEntity, remove };