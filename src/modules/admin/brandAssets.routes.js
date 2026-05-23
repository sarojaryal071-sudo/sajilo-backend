const express = require('express');
const router = express.Router();
const authGuard = require('../../middleware/auth.guard');
const roleGuard = require('../../middleware/role.guard');
const uiConfigService = require('../uiConfig/uiConfig.service');
const cloudinary = require('../../config/cloudinary');

// Admin uploads a brand asset → returns the Cloudinary URL
router.post(
  '/upload',
  authGuard,
  roleGuard('admin'),
  (req, res, next) => {
    const multer = require('multer');
    const uploadMem = multer({ storage: multer.memoryStorage() }).single('file');
    uploadMem(req, res, async (err) => {
      if (err) return next(err);
      try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const folder = req.body.folder || 'sajilo/brand';
        const storageService = require('../../services/storage.service');
        const result = await storageService.uploadFile(req.file, folder);

        return res.json({ success: true, url: result.url });
      } catch (err) {
        next(err);
      }
    });
  }
);

// Admin updates the branding config directly
router.put(
  '/branding',
  authGuard,
  roleGuard('admin'),
  async (req, res, next) => {
    try {
      const { branding } = req.body;
      if (!branding) return res.status(400).json({ error: 'branding object required' });

      const current = await uiConfigService.getDraftConfig('global');
      const updatedConfig = {
        ...current.config,
        branding: { ...(current.config.branding || {}), ...branding },
      };

      await uiConfigService.updateDraftConfig('global', updatedConfig, req.user.id);
      await uiConfigService.publishConfig('global', req.user.id);

      return res.json({ success: true, data: updatedConfig.branding });
    } catch (err) {
      next(err);
    }
  }
);

// List all images in the brand folder (Cloudinary Admin API)
router.get(
  '/list',
  authGuard,
  roleGuard('admin'),
  async (req, res, next) => {
    try {
      const folder = req.query.folder || 'sajilo/brand/';
      const storageService = require('../../services/storage.service');
      const images = await storageService.listFolder(folder);
      return res.json({ success: true, data: images });
    } catch (err) {
      console.error('Storage list error:', err);
      return res.status(500).json({ error: 'Failed to list images' });
    }
  }
);

// Delete an image by its public ID
router.delete(
  '/delete',
  authGuard,
  roleGuard('admin'),
  async (req, res, next) => {
    try {
      const { publicId } = req.body;
      if (!publicId) return res.status(400).json({ error: 'publicId is required' });
      const storageService = require('../../services/storage.service');
      await storageService.deleteFile(publicId);
      return res.json({ success: true });
    } catch (err) {
      console.error('Storage delete error:', err);
      return res.status(500).json({ error: 'Failed to delete image' });
    }
  }
);

module.exports = router;