// sajilo-backend/src/modules/files/files.routes.js
const express = require('express');
const router = express.Router();
const upload = require('../../middleware/upload.middleware');
const controller = require('./files.controller');
const authGuard = require('../../middleware/auth.guard');

router.use(authGuard);

router.delete('/:type/:id', controller.remove);
router.put('/profile-image', upload.single('file'), controller.replaceProfileImage);

module.exports = router;