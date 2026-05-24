// sajilo-backend/src/services/storage.service.js
const cloudinary = require('../config/cloudinary');
const storageConfig = require('../config/storage.config');

function extractPublicId(url) {
  try {
    const parts = url.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return null;
    const afterUpload = parts.slice(uploadIdx + 1);
    if (afterUpload[0] && afterUpload[0].startsWith('v')) {
      return afterUpload.slice(1).join('/').split('.')[0];
    }
    return afterUpload.join('/').split('.')[0];
  } catch {
    return null;
  }
}

async function uploadFile(file, folder) {
  if (storageConfig.provider !== 'cloudinary') {
    throw new Error(`Unsupported storage provider: ${storageConfig.provider}`);
  }

  if (file.path && file.path.startsWith('http')) {
    const publicId = extractPublicId(file.path);
    return { url: file.path, publicId };
  }

  if (file.buffer) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
          transformation: [
            { width: 512, height: 512, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(file.buffer);
    });
  }

  const result = await cloudinary.uploader.upload(file.path, { folder });
  return { url: result.secure_url, publicId: result.public_id };
}

async function deleteFile(publicId) {
  if (!publicId) throw new Error('publicId is required');
  await cloudinary.uploader.destroy(publicId);
}

function getFileUrl(publicId, options = {}) {
  return cloudinary.url(publicId, { secure: true, ...options });
}

function generateSignedUrl(publicId, options = {}) {
  const expiry = options.expiresIn || 3600;
  return cloudinary.utils.sign_url(
    publicId,
    options.transformation || {},
    {
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + expiry,
    }
  );
}

async function listFolder(folder) {
  const result = await cloudinary.api.resources({
    type: 'upload',
    prefix: folder,
    max_results: 100,
  });
  return (result.resources || []).map(r => ({
    url: r.secure_url,
    publicId: r.public_id,
    width: r.width,
    height: r.height,
    format: r.format,
    createdAt: r.created_at,
  }));
}

/**
 * Copy a file from one Cloudinary folder to another.
 * Returns the new file's URL and public ID.
 */
async function copyFile(sourceUrl, destinationFolder) {
  const sourcePublicId = extractPublicId(sourceUrl);
  if (!sourcePublicId) throw new Error('Cannot extract public_id from source URL');

  const result = await cloudinary.uploader.upload(sourceUrl, {
    folder: destinationFolder,
    resource_type: 'auto',
  });

  return { url: result.secure_url, publicId: result.public_id };
}

module.exports = {
  uploadFile,
  deleteFile,
  getFileUrl,
  generateSignedUrl,
  listFolder,
  copyFile,
};