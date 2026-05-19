// sajilo-backend/src/modules/media/media.routes.js
const express = require('express');
const router = express.Router();
const upload = require('../../middleware/upload.middleware');
const controller = require('./media.controller');
const authGuard = require('../../middleware/auth.guard');

router.use(authGuard);

// Profile image upload (user or worker)
router.post('/upload/profile-image', upload.single('file'), controller.uploadProfileImage);

// Document upload
router.post('/upload/document', upload.single('file'), controller.uploadDocument);

// Get files for an entity
router.get('/:entity_type/:entity_id', controller.getByEntity);

// Delete a media record
router.delete('/:id', controller.remove);

module.exports = router;