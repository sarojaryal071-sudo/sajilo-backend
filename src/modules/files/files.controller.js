const filesService = require('./files.service');
const mediaAuditService = require('../media/mediaAudit.service');
const { logAuditEvent } = require('../../services/audit.service');

async function remove(req, res) {
  try {
    const { type, id } = req.params;
    const userId = req.user.id;

    if (type === 'profile_image') {
      const result = await filesService.deleteProfileImage(userId);
      await mediaAuditService.logAction({ userId, fileType: 'profile', action: 'delete', req });
      try {
        await logAuditEvent({
          req,
          actorId: userId,
          action: 'file.deleted',
          entityType: 'profile_image',
          entityId: userId,
          entityDisplay: `User #${userId} profile image`,
          summary: `Profile image deleted`,
          severity: 'low',
          category: 'media',
          outcome: 'success',
        });
      } catch (auditErr) { console.error('Audit write failed (file delete):', auditErr); }
      return res.json({ success: true, ...result });
    }
    else if (type === 'document') {
      const result = await filesService.deleteDocument(Number(id), userId);
      await mediaAuditService.logAction({ userId, fileType: 'document', action: 'delete', req });
      try {
        await logAuditEvent({
          req,
          actorId: userId,
          action: 'document.deleted',
          entityType: 'document',
          entityId: Number(id),
          entityDisplay: `Document #${id}`,
          summary: `Document deleted`,
          severity: 'low',
          category: 'media',
          outcome: 'success',
        });
      } catch (auditErr) { console.error('Audit write failed (document delete):', auditErr); }
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

    try {
      await logAuditEvent({
        req,
        actorId: req.user.id,
        action: 'file.replaced',
        entityType: 'profile_image',
        entityId: req.user.id,
        entityDisplay: `User #${req.user.id} profile image`,
        summary: `Profile image replaced`,
        severity: 'low',
        category: 'media',
        outcome: 'success',
        newValues: { url: result.profile_image_url },
      });
    } catch (auditErr) { console.error('Audit write failed (file replace):', auditErr); }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = { remove, replaceProfileImage };