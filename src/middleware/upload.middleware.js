// sajilo-backend/src/middleware/upload.middleware.js
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve('uploads/temp'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImages = /jpeg|jpg|png|webp/;
  const allowedDocs = /pdf/;
  const extname = path.extname(file.originalname).toLowerCase();
  if (allowedImages.test(extname) || allowedDocs.test(extname)) {
    return cb(null, true);
  }
  cb(new Error('Only images (JPEG, PNG, WebP) and PDFs are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

module.exports = upload;