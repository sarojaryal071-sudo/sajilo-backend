// sajilo-backend/src/middleware/storage.middleware.js
const { STORAGE_PATHS } = require('../constants/storage.constants');

const PRIVATE_PATHS = [
  STORAGE_PATHS.DOCUMENTS_PLATFORM_PRIVATE,
];

function requirePrivateAccess(req, res, next) {
  const folder = req.body.folder || req.query.folder || '';
  if (PRIVATE_PATHS.some(path => folder.startsWith(path))) {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  next();
}

module.exports = { requirePrivateAccess };