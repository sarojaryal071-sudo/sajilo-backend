// sajilo-backend/src/modules/media/media.utils.js
const path = require('path');

const ALLOWED_ENTITY_TYPES = ['user', 'worker', 'document'];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf'];

function validateEntityType(type) {
  if (!ALLOWED_ENTITY_TYPES.includes(type)) {
    throw new Error(`Invalid entity_type: ${type}. Allowed: ${ALLOWED_ENTITY_TYPES.join(', ')}`);
  }
}

function generateFileName(entityType, userId, originalName) {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  return `${entityType}_${userId}_${timestamp}${ext}`;
}

function buildFileUrl(entityType, fileName) {
  return `/uploads/${entityType}/${fileName}`;
}

function getFileExtension(filename) {
  return path.extname(filename).slice(1).toLowerCase();
}

function validateFileType(mimetype, category = 'image') {
  if (category === 'image') {
    return ALLOWED_IMAGE_TYPES.includes(mimetype);
  }
  if (category === 'document') {
    return ALLOWED_DOC_TYPES.includes(mimetype);
  }
  return false;
}

module.exports = {
  validateEntityType,
  generateFileName,
  buildFileUrl,
  getFileExtension,
  validateFileType,
  ALLOWED_ENTITY_TYPES,
};