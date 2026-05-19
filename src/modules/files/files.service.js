// sajilo-backend/src/modules/files/files.service.js
const filesModel = require('./files.model');
const mediaService = require('../media/media.service');
const authModel = require('../auth/auth.model');

async function deleteProfileImage(userId) {
  const user = await authModel.findById(userId);
  if (!user) throw new Error('User not found');

  const oldUrl = user.profile_image_url;
  if (!oldUrl) throw new Error('No profile image to delete');

  // Update DB to remove the reference
  await filesModel.clearUserProfileImage(userId);

  // Delete from Cloudinary via media service (which handles both DB record and cloud deletion)
  // Since profile images are stored in media table as well, we need to find the media record and delete it.
  // But profile image uploads also create a media record? In our current setup, the profile image upload
  // (via users.media.controller) doesn't create a media record; it only updates users.profile_image_url.
  // However, the media table is used for generic uploads. For profile images, we only store the URL.
  // To cleanly delete the image from Cloudinary, we need the public_id.
  // Since we don't have the media record here, we'll use the cloudinary utility directly.
  const cloudinary = require('../../config/cloudinary');
  const publicId = getPublicIdFromUrl(oldUrl);
  if (publicId) {
    try { await cloudinary.uploader.destroy(publicId); } catch (e) { console.error('Cloudinary deletion failed:', e.message); }
  }

  return { message: 'Profile image deleted' };
}

async function replaceProfileImage(userId, file) {
  const entityType = 'user'; // we could infer from role, but default to user
  const user = await authModel.findById(userId);
  const oldUrl = user.profile_image_url;

  // Upload new image via media service (now uses Cloudinary)
  const { url: newUrl } = await mediaService.saveProfileImage(file, entityType, userId);

  // Update DB with new URL
  await filesModel.setUserProfileImage(userId, newUrl);

  // Delete old image from Cloudinary if it existed
  if (oldUrl) {
    const cloudinary = require('../../config/cloudinary');
    const publicId = getPublicIdFromUrl(oldUrl);
    if (publicId) {
      try { await cloudinary.uploader.destroy(publicId); } catch (e) { console.error('Cloudinary deletion failed:', e.message); }
    }
  }

  return { profile_image_url: newUrl };
}

async function deleteDocument(documentId, userId) {
  const doc = await filesModel.getDocumentById(documentId, userId);
  if (!doc) throw new Error('Document not found or not authorized');

  // Use media service to delete (handles DB and Cloudinary)
  await mediaService.deleteFile(documentId);

  return { message: 'Document deleted' };
}

function getPublicIdFromUrl(url) {
  try {
    const parts = url.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return null;
    const afterUpload = parts.slice(uploadIdx + 1);
    if (afterUpload[0] && afterUpload[0].startsWith('v')) {
      return afterUpload.slice(1).join('/').split('.')[0];
    }
    return afterUpload.join('/').split('.')[0];
  } catch { return null; }
}

module.exports = { deleteProfileImage, replaceProfileImage, deleteDocument };