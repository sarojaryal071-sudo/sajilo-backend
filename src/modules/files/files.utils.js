// sajilo-backend/src/modules/files/files.utils.js
const path = require('path');
const fs = require('fs');

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

/**
 * Extract the relative file path from a URL like '/uploads/user/file.jpg'.
 */
function extractFilePath(url) {
  if (!url) return null;
  // Remove leading slash if present, and ensure it's under uploads
  const relative = url.startsWith('/') ? url.slice(1) : url;
  return path.join(UPLOAD_ROOT, relative);
}

/**
 * Check if a file exists on disk.
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Safely delete a file – never throws if file is missing.
 */
function safeDelete(filePath) {
  try {
    if (fileExists(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (err) {
    console.error('[Files] Safe delete failed:', err.message);
  }
  return false;
}

module.exports = { extractFilePath, fileExists, safeDelete };