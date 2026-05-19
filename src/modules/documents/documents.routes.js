const express = require('express');
const router = express.Router();
const upload = require('../../middleware/upload.middleware');
const controller = require('./documents.controller');
const authGuard = require('../../middleware/auth.guard');
const uploadRateLimit = require('../../middleware/uploadRateLimit');

router.use(uploadRateLimit);
router.use(authGuard);

router.post('/upload', upload.single('file'), controller.upload);
router.get('/me', controller.getMyDocuments);
router.delete('/:id', controller.remove);

module.exports = router;