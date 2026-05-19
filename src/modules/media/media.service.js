// sajilo-backend/src/modules/media/media.service.js
const mediaModel = require('./media.model');
const { validateEntityType, generateFileName, buildFileUrl, validateFileType } = require('./media.utils');

// Cloudinary is now used via multer-storage-cloudinary; files arrive with .path = HTTPS URL.
// No local disk operations are needed.

async function saveProfileImage(file, entityType, userId) {
  validateEntityType(entityType);
  if (!['user', 'worker'].includes(entityType)) {
    throw new Error('Profile image only supports user or worker entity types');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
    throw new Error('Only JPEG, PNG, or WebP images are allowed');
  }

  // file.path is now a Cloudinary HTTPS URL (set by multer-storage-cloudinary)
  const fileUrl = file.path;

  const record = await mediaModel.create({
    entity_type: entityType,
    entity_id: userId,
    file_url: fileUrl,
    file_name: file.originalname,
    file_type: 'image',
    mime_type: file.mimetype,
    size_bytes: file.size || 0,
  });

  return { url: fileUrl, media_id: record.id };
}

async function saveDocument(file, entityType, userId) {
  validateEntityType(entityType);
  if (!validateFileType(file.mimetype, 'document')) {
    throw new Error('Only PDF documents are allowed');
  }

  const fileUrl = file.path;

  const record = await mediaModel.create({
    entity_type: 'document',
    entity_id: userId,
    file_url: fileUrl,
    file_name: file.originalname,
    file_type: 'document',
    mime_type: file.mimetype,
    size_bytes: file.size || 0,
  });

  return { url: fileUrl, media_id: record.id };
}

async function getFilesByEntity(entityType, entityId) {
  validateEntityType(entityType);
  return mediaModel.findByEntity(entityType, entityId);
}

async function deleteFile(mediaId) {
  const media = await mediaModel.findById(mediaId);
  if (!media) throw new Error('Media not found');

  // Delete from Cloudinary using the public_id extracted from the URL
  const cloudinary = require('../../config/cloudinary');
  const publicId = getPublicIdFromUrl(media.file_url);
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error('Cloudinary delete failed:', err.message);
    }
  }

  await mediaModel.remove(mediaId);
  return media;
}

/**
 * Extract Cloudinary public_id from a URL like:
 * https://res.cloudinary.com/<cloud>/image/upload/v1234/sajilo/images/abc.jpg
 */
function getPublicIdFromUrl(url) {
  try {
    const parts = url.split('/');
    // Find the index of 'upload/' and take everything after that, excluding version
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return null;
    // The public_id is everything after the version folder (v1234) if present
    const afterUpload = parts.slice(uploadIdx + 1);
    // If the first element starts with 'v', it's a version, skip it
    if (afterUpload[0] && afterUpload[0].startsWith('v')) {
      return afterUpload.slice(1).join('/').split('.')[0]; // remove extension
    }
    return afterUpload.join('/').split('.')[0];
  } catch {
    return null;
  }
}

module.exports = { saveProfileImage, saveDocument, getFilesByEntity, deleteFile };