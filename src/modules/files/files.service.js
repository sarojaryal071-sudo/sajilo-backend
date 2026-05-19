// sajilo-backend/src/modules/files/files.service.js
const filesModel = require('./files.model');
const filesUtils = require('./files.utils');
const mediaService = require('../media/media.service');
const authModel = require('../auth/auth.model');

/**
 * Delete the profile image of the currently logged‑in user.
 * - Sets profile_image_url to NULL in the users table.
 * - Deletes the physical file from disk.
 */
async function deleteProfileImage(userId) {
  // Get current user to find the old image URL
  const user = await authModel.findById(userId);
  if (!user) throw new Error('User not found');

  const oldUrl = user.profile_image_url;
  if (!oldUrl) {
    throw new Error('No profile image to delete');
  }

  // Update DB to remove the reference
  await filesModel.clearUserProfileImage(userId);

  // Delete the old file
  const oldFilePath = filesUtils.extractFilePath(oldUrl);
  filesUtils.safeDelete(oldFilePath);

  return { message: 'Profile image deleted' };
}

/**
 * Replace the profile image.
 * - Uploads the new file via media module.
 * - Updates the user's profile_image_url.
 * - Deletes the old file.
 */
async function replaceProfileImage(userId, file) {
  const entityType = 'user'; // we could infer from role, but default to user
  const user = await authModel.findById(userId);
  const oldUrl = user.profile_image_url;

  // Upload new image (media module handles file storage)
  const { url: newUrl } = await mediaService.saveProfileImage(file, entityType, userId);

  // Update DB with new URL
  await filesModel.setUserProfileImage(userId, newUrl);

  // Delete old file if it existed
  if (oldUrl) {
    const oldFilePath = filesUtils.extractFilePath(oldUrl);
    filesUtils.safeDelete(oldFilePath);
  }

  return { profile_image_url: newUrl };
}

/**
 * Delete a document by ID, verifying ownership.
 */
async function deleteDocument(documentId, userId) {
  // Fetch document and verify ownership
  const doc = await filesModel.getDocumentById(documentId, userId);
  if (!doc) throw new Error('Document not found or not authorized');

  // Delete the physical file
  const filePath = filesUtils.extractFilePath(doc.file_url);
  filesUtils.safeDelete(filePath);

  // Delete the database record
  await filesModel.deleteDocument(documentId);

  return { message: 'Document deleted' };
}

module.exports = { deleteProfileImage, replaceProfileImage, deleteDocument };