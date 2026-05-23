const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: (req, file) => {
      // The frontend sends the folder as a form field – multer has already
      // populated req.body by the time this callback runs.
      return req.body.folder || 'sajilo/brand';
    },
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    transformation: [
      { width: 512, height: 512, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
    ],
  },
});

const uploadBrand = multer({ storage });

module.exports = uploadBrand;