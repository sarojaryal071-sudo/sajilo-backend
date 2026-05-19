// sajilo-backend/src/modules/media/media.service.js
const mediaModel = require('./media.model');
const { validateEntityType, generateFileName, buildFileUrl, validateFileType } = require('./media.utils');
const fs = require('fs');
const path = require('path');

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

async function saveProfileImage(file, entityType, userId) {
  validateEntityType(entityType);
  if (!['user', 'worker'].includes(entityType)) {
    throw new Error('Profile image only supports user or worker entity types');
  }
  if (!validateFileType(file.mimetype, 'image')) {
    throw new Error('Only JPEG, PNG, or WebP images are allowed');
  }

  const fileName = generateFileName(entityType, userId, file.originalname);
  const uploadDir = path.join(UPLOAD_ROOT, entityType);
  const destPath = path.join(uploadDir, fileName);

  fs.mkdirSync(uploadDir, { recursive: true });
  fs.renameSync(file.path, destPath);

  const fileUrl = buildFileUrl(entityType, fileName);

  const record = await mediaModel.create({
    entity_type: entityType,
    entity_id: userId,
    file_url: fileUrl,
    file_name: file.originalname,
    file_type: 'image',
    mime_type: file.mimetype,
    size_bytes: file.size,
  });

  return { url: fileUrl, media_id: record.id };
}

async function saveDocument(file, entityType, userId) {
  validateEntityType(entityType);
  if (!validateFileType(file.mimetype, 'document')) {
    throw new Error('Only PDF documents are allowed');
  }

  const fileName = generateFileName(entityType, userId, file.originalname);
  const uploadDir = path.join(UPLOAD_ROOT, 'documents');
  const destPath = path.join(uploadDir, fileName);

  fs.mkdirSync(uploadDir, { recursive: true });
  fs.renameSync(file.path, destPath);

  const fileUrl = buildFileUrl('documents', fileName);

  const record = await mediaModel.create({
    entity_type: 'document',
    entity_id: userId,
    file_url: fileUrl,
    file_name: file.originalname,
    file_type: 'document',
    mime_type: file.mimetype,
    size_bytes: file.size,
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

  const filePath = path.join(UPLOAD_ROOT, media.entity_type, path.basename(media.file_url));
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error('Failed to delete physical file:', err.message);
  }

  await mediaModel.remove(mediaId);
  return media;
}

module.exports = { saveProfileImage, saveDocument, getFilesByEntity, deleteFile };