// sajilo-backend/src/modules/users/users.media.controller.js
const mediaService = require('../media/media.service');
const usersService = require('./users.service');
const mediaAuditService = require('../media/mediaAudit.service');


async function uploadProfileImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const entityType = req.user.role === 'worker' ? 'worker' : 'user';
    const userId = req.user.id;

    // Use the media module to store the file
    const { url } = await mediaService.saveProfileImage(req.file, entityType, userId);

    // Update the user's profile image in the database
    await usersService.updateProfileImage(userId, url);

            await mediaAuditService.logAction({
          userId,
          fileType: 'profile',
          fileUrl: url,
          action: 'upload',
          req,
        });
        res.json({ success: true, data: { profile_image_url: url } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = { uploadProfileImage };