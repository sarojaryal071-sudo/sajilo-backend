const documentsModel = require('./documents.model');
const mediaService = require('../media/media.service');
const fs = require('fs');
const path = require('path');

const ALLOWED_DOC_TYPES = ['gov_id', 'selfie_with_id', 'certificate', 'portfolio', 'address_proof', 'misc'];

function validateType(type) {
  if (!ALLOWED_DOC_TYPES.includes(type)) {
    throw new Error(`Invalid document type. Allowed: ${ALLOWED_DOC_TYPES.join(', ')}`);
  }
}

async function uploadDocument(file, userId, docType) {
  validateType(docType);

  // Reuse the media system to store the file
  const { url } = await mediaService.saveDocument(file, 'document', userId);

  // Store structured metadata
  const record = await documentsModel.create({
    userId,
    type: docType,
    fileUrl: url,
    originalFilename: file.originalname,
  });

  return record;
}

async function getUserDocuments(userId) {
  return documentsModel.findByUser(userId);
}

async function deleteDocument(documentId, userId) {
  const doc = await documentsModel.findById(documentId);
  if (!doc) throw new Error('Document not found');
  if (doc.user_id !== userId) throw new Error('Not authorized');

  // Delete the physical file via media system
  const mediaId = null; // we don't store media id, so we delete by path
  // Instead we can use the media service to delete by file path
  // We'll just delete the file directly
  const filePath = path.join(process.cwd(), 'uploads', 'documents', path.basename(doc.file_url));
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error('Failed to delete physical document:', err.message);
  }

  await documentsModel.remove(documentId);
  return doc;
}

module.exports = { uploadDocument, getUserDocuments, deleteDocument };