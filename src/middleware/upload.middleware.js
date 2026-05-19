// sajilo-backend/src/middleware/upload.middleware.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    return {
      folder: isImage ? 'sajilo/images' : 'sajilo/documents',
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      transformation: isImage ? [
        {
          width: 512,
          height: 512,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto',
        },
      ] : undefined,
    };
  },
});

const upload = multer({ storage });

module.exports = upload;