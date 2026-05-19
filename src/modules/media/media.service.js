// sajilo-backend/src/modules/media/media.service.js
const mediaModel = require('./media.model');
const { validateEntityType, generateFileName, buildFileUrl, validateFileType } = require('./media.utils');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

async function saveProfileImage(file, entityType, userId) {
  validateEntityType(entityType);
  if (!['user', 'worker'].includes(entityType)) {
    throw new Error('Profile image only supports user or worker entity types');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
    throw new Error('Only JPEG, PNG, or WebP images are allowed');
  }

  const fileName = generateFileName(entityType, userId, file.originalname);
  const uploadDir = path.join(UPLOAD_ROOT, entityType);
  const destPath = path.join(uploadDir, fileName);

  fs.mkdirSync(uploadDir, { recursive: true });

  // Optimize and save the image
  try {
    await sharp(file.path)
      .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(destPath);
  } catch (err) {
    // If optimization fails, fall back to the original file
    fs.copyFileSync(file.path, destPath);
  }

  // Remove the temp file
  try { fs.unlinkSync(file.path); } catch (_) {}

  const fileUrl = buildFileUrl(entityType, fileName);

  const record = await mediaModel.create({
    entity_type: entityType,
    entity_id: userId,
    file_url: fileUrl,
    file_name: file.originalname,
    file_type: 'image',
    mime_type: 'image/jpeg',   // we converted to JPEG
    size_bytes: fs.statSync(destPath).size,
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